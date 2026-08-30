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
import { useTeamSummary } from "@/hooks/useTeamSummary";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import GradientCard from "@/components/GradientCard";
import WeeklyBarChart from "@/components/WeeklyBarChart";
import IconPill from "@/components/IconPill";
import CharacterSlot from "@/components/CharacterSlot";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import NoTeamScreen from "@/features/team/NoTeamScreen";
import {
  ClipboardTextIcon,
  CrownSimpleIcon,
  DotsThreeCircleIcon,
  MoonStarsIcon,
  TrophyIcon,
} from "@/components/icons";

const SCREEN_PADDING = 24;

export default function TeamScreen() {
  const router = useRouter();
  const { data, hasTeam, loading, error } = useTeamSummary();
  const summary = data?.summary;
  const memberStatus = data?.memberStatus;

  // No team joined yet → the empty state (S04-06).
  if (!loading && !error && !hasTeam) {
    return <NoTeamScreen />;
  }

  const handleSuggestNap = () => {
    console.log("TODO: suggest a nap to the team");
  };

  const handleOpenRanking = () => {
    router.push("/team/ranking");
  };

  const handleSeeAllMembers = () => {
    console.log("TODO: open the full member list");
  };

  const rate = summary ? `${summary.weekly.ratePercent}` : "--";
  const deltaText = summary
    ? `先週より ${summary.weekly.deltaPercent >= 0 ? "+" : ""}${summary.weekly.deltaPercent}% ↑`
    : "";
  const restingCount = memberStatus?.memberStatusCounts.resting ?? 0;
  const workingCount = memberStatus?.memberStatusCounts.working ?? 0;
  const napMinutes = summary?.suggestion.napMinutes ?? 15;
  const suggestionHeadline = (
    summary?.suggestion.headline ?? ["チームは長時間", "がんばっています"]
  ).join("\n");

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell />
          </View>

          {/* Hero — 今週の Team Nap */}
          <GradientCard
            colors={[colors.mintVeil, colors.white]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.heroCard}
          >
            <View style={styles.heroSummary}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroCaption}>今週の Team Nap</Text>
                <View style={styles.heroNumberRow}>
                  <Text style={styles.heroNumber}>{rate}</Text>
                  <Text style={styles.heroPercent}>%</Text>
                </View>
              </View>
              {summary ? (
                <View style={styles.deltaPill}>
                  <Text style={styles.deltaText}>{deltaText}</Text>
                </View>
              ) : null}
            </View>
            {summary ? <WeeklyBarChart days={summary.weekly.bars} /> : null}
          </GradientCard>

          {/* 現在の状態 */}
          <View style={styles.statusRow}>
            <IconPill
              icon={<MoonStarsIcon size={22} color={colors.primary} />}
              backgroundColor={colors.brandSubtle}
              style={styles.statusPill}
            >
              <View style={styles.statusTextRow}>
                <Text style={styles.statusLabel}>仮眠中</Text>
                <Text style={[styles.statusValue, styles.statusValueBrand]}>
                  {restingCount}
                </Text>
                <Text style={styles.statusLabel}>人</Text>
              </View>
            </IconPill>
            <IconPill
              icon={<ClipboardTextIcon size={22} />}
              backgroundColor={colors.surfaceSunken}
              style={styles.statusPill}
            >
              <View style={styles.statusTextRow}>
                <Text style={styles.statusLabel}>作業中</Text>
                <Text style={[styles.statusValue, styles.statusValuePrimary]}>
                  {workingCount}
                </Text>
                <Text style={styles.statusLabel}>人</Text>
              </View>
            </IconPill>
          </View>

          {/* チームへの提案 */}
          <GradientCard
            colors={[colors.brandGradientFrom, colors.brandGradientTo]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.suggestionCard}
          >
            <View style={styles.suggestionRow}>
              <CharacterSlot size={96} borderColor={colors.white} />
              <View style={styles.suggestionTextCol}>
                <Text style={styles.suggestionTitle}>{suggestionHeadline}</Text>
                <Text style={styles.suggestionBody}>
                  {summary?.suggestion.body ?? ""}
                </Text>
              </View>
            </View>
            <PillButton
              variant="onColor"
              label={`${napMinutes}分仮眠を提案`}
              onPress={handleSuggestNap}
              icon={<MoonStarsIcon size={22} color={colors.primary} />}
              textStyle={styles.smallButtonText}
              style={styles.smallButton}
            />
          </GradientCard>

          {/* 今週の達成 */}
          {summary ? (
            <IconPill
              icon={<TrophyIcon size={22} />}
              backgroundColor={colors.brandSubtle}
              gap={10}
            >
              <Text style={styles.achievementText}>{summary.achievement}</Text>
            </IconPill>
          ) : null}

          {/* メンバーのようす */}
          <View style={styles.membersSection}>
            <Text style={styles.membersHeading}>メンバーのようす</Text>
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
                onPress={handleSeeAllMembers}
                accessibilityRole="button"
                accessibilityLabel="メンバーをもっと見る"
                style={styles.membersMore}
                hitSlop={8}
              >
                <DotsThreeCircleIcon size={40} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ランキング */}
          <PillButton
            variant="outline"
            label="仮眠上手ランキングを見る"
            onPress={handleOpenRanking}
            icon={<CrownSimpleIcon size={22} />}
            textStyle={styles.smallButtonText}
            style={styles.smallButton}
          />

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
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
    paddingTop: 8,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
    marginBottom: 2,
  },

  // Hero
  heroCard: {
    width: "100%",
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  heroSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  heroTextCol: {
    alignItems: "flex-start",
  },
  heroCaption: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  heroNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  heroNumber: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: colors.textBrand,
  },
  heroPercent: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.textBrand,
  },
  deltaPill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },

  // 現在の状態
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    flex: 1,
  },
  statusTextRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statusLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
  },
  statusValueBrand: {
    color: colors.textBrand,
  },
  statusValuePrimary: {
    color: colors.textPrimary,
  },

  // チームへの提案
  suggestionCard: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 72,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  suggestionTextCol: {
    flex: 1,
    gap: 4,
  },
  suggestionTitle: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.white,
  },
  suggestionBody: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.white,
    opacity: 0.85,
  },
  smallButton: {
    height: 47,
    minHeight: 47,
  },
  smallButtonText: {
    fontSize: 14,
  },

  // 今週の達成
  achievementText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textSuccess,
  },

  // メンバーのようす
  membersSection: {
    gap: 8,
    width: "100%",
  },
  membersHeading: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
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

  footer: {
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
