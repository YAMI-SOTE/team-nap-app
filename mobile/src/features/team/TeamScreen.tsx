import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useTeamSummary } from "@/hooks/useTeamSummary";
import { useRealtimeMembers } from "@/features/realtime/RealtimeProvider";
import NapProposalSheet from "@/features/team/NapProposalSheet";
import Toast from "@/components/Toast";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import SceneBackground from "@/components/SceneBackground";
import StatusPill from "@/components/StatusPill";
import Logo from "@/components/Logo";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import NoTeamScreen from "@/features/team/NoTeamScreen";
import {
  ClipboardTextIcon,
  DotsThreeCircleIcon,
  MoonStarsIcon,
  TrophyIcon,
} from "@/components/icons";

/**
 * チーム（Figma S04-01c_Team_AltB, node 838:6060）。
 *
 * 上半分はイラスト背景の上に達成率だけを大きく置くヒーロー、下半分は
 * 白いシートにメンバー・達成・CTAをまとめる二層構成。猫と吹き出しは
 * シートの上端にまたがるように重ねる。
 *
 * 接続エラー画面・未加入時の NoTeamScreen・ライブ在席・仮眠提案シート
 * とトーストは上流の実装をそのまま使う。
 */

const SCREEN_PADDING = 32;
const CAT_SIZE = 116;

export default function TeamScreen() {
  const router = useRouter();
  const { data, hasTeam, loading, error, connectionError, reload } =
    useTeamSummary();
  const { memberStatus: liveMemberStatus } = useRealtimeMembers();
  const summary = data?.summary;
  // Prefer the live presence snapshot (WebSocket) when we have one.
  const memberStatus = liveMemberStatus ?? data?.memberStatus;

  const [proposalOpen, setProposalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (connectionError) {
    return <ConnectionErrorView onRetry={reload} />;
  }

  // No team joined yet → the empty state (S04-06).
  if (!loading && !error && !hasTeam) {
    return <NoTeamScreen />;
  }

  const rate = summary ? `${summary.weekly.ratePercent}` : "--";
  const deltaText = summary
    ? `先週より ${summary.weekly.deltaPercent >= 0 ? "+" : ""}${summary.weekly.deltaPercent}% ↑`
    : "";
  const restingCount = memberStatus?.memberStatusCounts.resting ?? 0;
  const workingCount = memberStatus?.memberStatusCounts.working ?? 0;
  const memberCount = memberStatus?.memberCount ?? 0;
  const napMinutes = summary?.suggestion.napMinutes ?? 15;
  const bubbleText = (
    summary?.suggestion.headline ?? [
      "チーム、がんばりすぎかも。",
      "いっしょにひとやすみしない？",
    ]
  ).join("\n");

  return (
    <SceneBackground
      source={require("../../../assets/backgrounds/team-day.png")}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Hero — イラストの上に達成率だけを見せる */}
        <View style={styles.hero}>
          <View style={styles.heroCol}>
            <View style={styles.header}>
              <Logo width={72} color={colors.primary} />
              <NotificationBell size={28} />
            </View>

            <View style={styles.stats}>
              <View style={styles.metric}>
                <Text style={styles.caption}>今週の Team Nap 達成率</Text>
                <View style={styles.metricRow}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreValue}>{rate}</Text>
                    <Text style={styles.scoreUnit}>%</Text>
                  </View>
                  {summary ? (
                    <View style={styles.deltaPill}>
                      <Text style={styles.deltaText}>{deltaText}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.chips}>
                <StatusPill
                  label={`仮眠中 ${restingCount}人`}
                  icon={<MoonStarsIcon size={16} color={colors.primary} />}
                />
                <StatusPill
                  label={`作業中 ${workingCount}人`}
                  icon={<ClipboardTextIcon size={16} color={colors.primary} />}
                />
              </View>
            </View>
          </View>

          {/* 猫と吹き出し。シートの上端に少しかぶせる */}
          <View style={styles.catRow} pointerEvents="none">
            <View style={styles.bubbleWrap}>
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{bubbleText}</Text>
              </View>
              <View style={styles.bubbleTail} />
            </View>
            <Image
              source={require("../../../assets/characters/cat-team.png")}
              style={styles.cat}
              resizeMode="contain"
              accessible={false}
            />
          </View>
        </View>

        {/* Sheet — メンバー・達成・CTA */}
        <View style={styles.sheet}>
          <View style={styles.sheetCol}>
            <View style={styles.members}>
              <Text style={styles.membersHeading}>
                いまのメンバー（{memberCount}人）
              </Text>
              <View style={styles.membersRow}>
                {(memberStatus?.members ?? []).map((member) => (
                  <MemberAvatar
                    key={member.id}
                    label={member.label}
                    status={member.status as MemberStatus}
                    napBadge
                    onPress={() => router.push(`/members/${member.id}`)}
                  />
                ))}
                <Pressable
                  onPress={() => router.push("/settings/team-members")}
                  accessibilityRole="button"
                  accessibilityLabel="メンバーをもっと見る"
                  style={styles.membersMore}
                  hitSlop={8}
                >
                  <DotsThreeCircleIcon size={40} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.achievement}>
              <View style={styles.achievementChip}>
                <TrophyIcon size={16} color={colors.textBrand} />
                <Text style={styles.achievementText}>
                  {summary?.achievement ?? ""}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/team/ranking")}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.rankingLink}>仮眠上手ランキングを見る</Text>
              </Pressable>
            </View>

            <PillButton
              variant="primary"
              label={`${napMinutes}分仮眠を提案`}
              onPress={() => setProposalOpen(true)}
              icon={<MoonStarsIcon size={24} color={colors.white} />}
              elevated={false}
              style={styles.suggestButton}
              textStyle={styles.suggestButtonLabel}
            />

            <View style={styles.footer}>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <NapProposalSheet
        visible={proposalOpen}
        defaultMinutes={napMinutes}
        slotNote={
          memberStatus
            ? `${memberStatus.memberCount}人中${memberStatus.memberStatusCounts.working}人が作業中`
            : undefined
        }
        onClose={() => setProposalOpen(false)}
        onSent={(minutes) => {
          setProposalOpen(false);
          setToast(`${minutes}分の仮眠を提案しました`);
        }}
      />
      <Toast
        visible={toast != null}
        message={toast ?? ""}
        onHide={() => setToast(null)}
      />
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: SCREEN_PADDING,
  },
  heroCol: {
    width: "100%",
    maxWidth: 402,
    gap: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stats: {
    gap: 15,
  },
  metric: {
    gap: 6,
  },
  caption: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  scoreValue: {
    fontSize: 52,
    lineHeight: 68,
    fontWeight: "700",
    letterSpacing: -0.52,
    color: colors.textPrimary,
  },
  scoreUnit: {
    fontSize: 24,
    lineHeight: 41,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  deltaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  deltaText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  chips: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  catRow: {
    width: "100%",
    maxWidth: 402,
    marginTop: "auto",
    // シートの上端に少しだけ食い込ませる（Figma で猫の足元が 8px 重なる）。
    marginBottom: -8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bubbleWrap: {
    flexShrink: 1,
    maxWidth: 226,
  },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#C4EAE9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    transform: [{ rotate: "-2deg" }],
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  bubbleTail: {
    position: "absolute",
    right: 12,
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.96)",
    transform: [{ rotate: "-45deg" }],
  },
  cat: {
    width: CAT_SIZE,
    height: CAT_SIZE,
  },
  sheet: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: SCREEN_PADDING,
    shadowColor: "#0D1F21",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 12,
  },
  sheetCol: {
    width: "100%",
    maxWidth: 402,
    gap: 20,
  },
  members: {
    gap: 17,
  },
  membersHeading: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
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
  achievement: {
    gap: 12,
  },
  achievementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.brandSubtle,
  },
  achievementText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  rankingLink: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
    textAlign: "center",
  },
  suggestButton: {
    borderRadius: 32,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  suggestButtonLabel: {
    fontSize: 20,
    lineHeight: 30,
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
