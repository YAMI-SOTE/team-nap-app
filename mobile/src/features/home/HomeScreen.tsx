import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { TEAM_SCORE_MAX } from "@/constants/home";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useRestRecommendation } from "@/hooks/useRestRecommendation";
import { useRealtimeMembers } from "@/features/realtime/RealtimeProvider";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import Hairline from "@/components/Hairline";
import ProgressBar from "@/components/ProgressBar";
import CharacterSlot from "@/components/CharacterSlot";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import {
  DotsThreeCircleIcon,
  MoonStarsIcon,
  UsersThreeIcon,
} from "@/components/icons";

const SCREEN_PADDING = 28;

export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, error } = useHomeSummary();
  const { data: restRecommendation } = useRestRecommendation();
  const { memberStatus: liveMemberStatus } = useRealtimeMembers();
  const summary = data?.summary;

  // Solo accounts never see team score / members / free-slot blocks.
  const hasTeam = summary?.hasTeam ?? false;

  // Prefer the live presence snapshot (WebSocket) over the fetched one.
  const memberStatus =
    hasTeam && liveMemberStatus ? liveMemberStatus : data?.memberStatus;

  const handleSuggestTeamNap = () => {
    console.log("TODO: suggest a nap to everyone");
    // TODO: wire to the "suggest a nap to everyone" backend action.
  };

  const memberStatusSummary = memberStatus
    ? formatMemberStatusSummary(memberStatus.memberStatusCounts)
    : "";

  const nextFree = summary?.nextFree ?? null;

  const nextFreeContext = nextFree
    ? `次の空き時間 ・ 次の予定まで${formatTimeUntilNextFree(nextFree.hoursUntilStart, nextFree.minutesUntilStartRemainder)}`
    : "次の空き時間";

  const nextFreeRange = nextFree
    ? `${nextFree.start}〜${nextFree.end}`
    : "予定はありません";

  const nextFreeDetail =
    nextFree && memberStatus
      ? `${memberStatus.memberCount}人中${nextFree.availableMemberCount}人が予定なし`
      : "カレンダーを連携すると空き時間が表示されます";

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell size={26} />
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.dateLabel}>
              {summary?.todayLabel ?? "読み込み中"}
            </Text>
            <View style={styles.heroRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTitle}>
                  {(summary?.headline ?? ["今日のチームは", "確認中です"]).join("\n")}
                </Text>
              </View>
              <CharacterSlot
                size={84}
                source={require("../../../assets/characters/genki.png")}
              />
            </View>
          </View>

          {/* 個人向け休息提案 */}
          {restRecommendation?.shouldRest &&
            restRecommendation.recommendedStart &&
            restRecommendation.recommendedEnd ? (
            <View style={styles.restRecommendation}>
              <View style={styles.restRecommendationText}>
                <Text style={styles.restRecommendationLabel}>
                  そろそろ休息がおすすめです
                </Text>

                <Text style={styles.restRecommendationTime}>
                  {restRecommendation.recommendedStart}〜
                  {restRecommendation.recommendedEnd}
                </Text>

                <Text style={styles.restRecommendationDetail}>
                  {restRecommendation.recommendedMinutes}分だけ休んでみませんか？
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/rest")}
                accessibilityRole="button"
                accessibilityLabel="仮眠を開始"
                style={styles.restRecommendationButton}
              >
                <MoonStarsIcon size={20} color={colors.primary} />
                <Text style={styles.restRecommendationButtonText}>
                  仮眠を開始
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* チームの状態 — チーム加入時のみ */}

          {/* チームの状態 — チーム加入時のみ */}
          {hasTeam ? (
            <View style={styles.section}>
              <Hairline />
              <View style={styles.rowBetween}>
                <View style={styles.metricText}>
                  <Text style={styles.sectionLabel}>チームの状態</Text>
                  <View style={styles.metricNumberRow}>
                    <Text style={styles.metricNumber}>
                      {summary?.teamScore ?? "--"}
                    </Text>
                    <Text style={styles.metricUnit}>/{TEAM_SCORE_MAX}</Text>
                  </View>
                </View>
              </View>
              <ProgressBar
                value={summary?.teamScore ?? 0}
                max={TEAM_SCORE_MAX}
              />
              <Text style={styles.sectionLabel}>
                {summary?.aiAdvice ?? "AIアドバイスを読み込み中"}
              </Text>
            </View>
          ) : null}

          {/* メンバー — チーム加入時のみ */}
          {hasTeam ? (
            <View style={styles.section}>
              <Hairline />
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>メンバーのようす</Text>
                <Text style={styles.sectionSubLabel}>
                  {memberStatusSummary}
                </Text>
              </View>
              <View style={styles.membersRow}>
                {(memberStatus?.members ?? []).map((member) => (
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
          ) : null}

          {/* 次の空き時間 — チーム加入時のみ */}
          {hasTeam ? (
            <View style={styles.section}>
              <Hairline />
              <View style={styles.nextFreeText}>
                <Text style={styles.sectionLabel}>{nextFreeContext}</Text>
                <Text style={styles.nextFreeRange}>{nextFreeRange}</Text>
                <Text style={styles.sectionSubLabel}>{nextFreeDetail}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.bottomActions}>
            {hasTeam ? (
              <PillButton
                variant="outline"
                label="みんなに仮眠を提案"
                onPress={handleSuggestTeamNap}
                icon={<MoonStarsIcon size={24} color={colors.primary} />}
                style={styles.actionButton}
              />
            ) : (
              <PillButton
                variant="outline"
                label="チームに参加する"
                onPress={() => router.push("/team/join")}
                icon={<UsersThreeIcon size={24} color={colors.primary} />}
                style={styles.actionButton}
              />
            )}

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
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
  restRecommendation: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.primary,
    gap: 14,
  },

  restRecommendationText: {
    gap: 3,
  },

  restRecommendationLabel: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.white,
  },

  restRecommendationTime: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "700",
    color: colors.white,
  },

  restRecommendationDetail: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.white,
  },

  restRecommendationButton: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },

  restRecommendationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
