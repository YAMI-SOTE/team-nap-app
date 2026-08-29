import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { TEAM_SCORE_MAX } from "@/constants/home";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import Hairline from "@/components/Hairline";
import ProgressBar from "@/components/ProgressBar";
import CharacterSlot from "@/components/CharacterSlot";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import PillButton from "@/components/PillButton";
import {
  BellIcon,
  DotsThreeCircleIcon,
  MoonStarsIcon,
} from "@/components/icons";

const SCREEN_PADDING = 28;

export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, error } = useHomeSummary();

  const handleOpenNotifications = () => {
    console.log("TODO: open notifications screen");
    // TODO: no notifications screen exists yet.
  };

  const handleSuggestTeamNap = () => {
    console.log("TODO: suggest a nap to everyone");
    // TODO: wire to the "suggest a nap to everyone" backend action.
  };

  const memberStatusSummary = data
    ? formatMemberStatusSummary(data.memberStatusCounts)
    : "";

  const nextFreeContext = data
    ? `次の空き時間 ・ 次の予定まで${formatTimeUntilNextFree(data.nextFree.hoursUntilStart, data.nextFree.minutesUntilStartRemainder)}`
    : "次の空き時間";

  const nextFreeRange = data
    ? `${data.nextFree.start}〜${data.nextFree.end}`
    : "--:--〜--:--";

  const nextFreeDetail = data
    ? `${data.memberCount}人中${data.nextFree.availableMemberCount}人が予定なし`
    : "";

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <Pressable
              onPress={handleOpenNotifications}
              accessibilityRole="button"
              accessibilityLabel="通知"
              hitSlop={8}
            >
              <BellIcon size={26} color={colors.primary} showDot />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.dateLabel}>
              {data?.todayLabel ?? "読み込み中"}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTitle}>
                  {(data?.headline ?? ["今日のチームは", "確認中です"]).join("\n")}
                </Text>
              </View>
              <CharacterSlot size={84} />
            </View>
          </View>

          {/* チームの状態 */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.rowBetween}>
              <View style={styles.metricText}>
                <Text style={styles.sectionLabel}>チームの状態</Text>
                <View style={styles.metricNumberRow}>
                  <Text style={styles.metricNumber}>
                    {data?.teamScore ?? "--"}
                  </Text>
                  <Text style={styles.metricUnit}>/{TEAM_SCORE_MAX}</Text>
                </View>
              </View>
            </View>
            <ProgressBar value={data?.teamScore ?? 0} max={TEAM_SCORE_MAX} />
            <Text style={styles.sectionLabel}>
              {data?.aiAdvice ?? "AIアドバイスを読み込み中"}
            </Text>
          </View>

          {/* メンバー */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>メンバーのようす</Text>
              <Text style={styles.sectionSubLabel}>{memberStatusSummary}</Text>
            </View>
            <View style={styles.membersRow}>
              {(data?.members ?? []).map((member) => (
                <MemberAvatar
                  key={member.id}
                  label={member.label}
                  status={member.status as MemberStatus}
                  onPress={() => router.push(`/members/${member.id}`)}
                />
              ))}
              <Pressable
                onPress={() => router.push("/team")}
                accessibilityRole="button"
                accessibilityLabel="メンバーをもっと見る"
                style={styles.membersMore}
                hitSlop={8}
              >
                <DotsThreeCircleIcon size={40} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 次の空き時間 */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.nextFreeText}>
              <Text style={styles.sectionLabel}>{nextFreeContext}</Text>
              <Text style={styles.nextFreeRange}>{nextFreeRange}</Text>
              <Text style={styles.sectionSubLabel}>{nextFreeDetail}</Text>
            </View>
          </View>

          <View style={styles.bottomActions}>
            <PillButton
              variant="outline"
              label="みんなに仮眠を提案"
              onPress={handleSuggestTeamNap}
              icon={<MoonStarsIcon size={24} color={colors.primary} />}
              style={styles.actionButton}
            />

            <PillButton
              variant="primary"
              label="仮眠を開始"
              onPress={() => router.push("/rest")}
              icon={<MoonStarsIcon size={22} color={colors.white} />}
              style={styles.actionButton}
            />

            <View style={styles.sectionFooter}>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function formatMemberStatusSummary(
  counts: Record<MemberStatus, number>,
): string {
  return [`仮眠中 ${counts.resting}人`, `作業中 ${counts.working}人`].join(" ・ ");
}

function formatTimeUntilNextFree(hours: number, minutes: number): string {
  if (hours > 0 && minutes > 0) {
    return `${hours}時間${minutes}分`;
  }

  if (hours > 0) {
    return `${hours}時間`;
  }

  return `${minutes}分`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hero: {
    gap: 10,
    paddingTop: 8,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 45,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  section: {
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricText: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  sectionSubLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  metricNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  metricNumber: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  membersMore: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  nextFreeText: {
    gap: 2,
  },
  nextFreeRange: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  bottomActions: {
    marginTop: "auto",
    gap: 10,
    paddingTop: 4,
  },
  actionButton: {
    minHeight: 58,
  },
  sectionFooter: {
    minHeight: 20,
    justifyContent: "center",
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
});
