import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";

import { colors } from "@/theme/colors";
import { TEAM_SCORE_MAX } from "@/constants/home";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useRealtimeMembers } from "@/features/realtime/RealtimeProvider";
import { useRestRecommendation } from "@/hooks/useRestRecommendation";
import SceneBackground from "@/components/SceneBackground";
import SpriteLoop from "@/components/SpriteLoop";
import StatusPill from "@/components/StatusPill";
import Logo from "@/components/Logo";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import { MoonStarsIcon, TimerIcon, UsersThreeIcon } from "@/components/icons";
import { CAT_IDLE_FRAMES, CAT_IDLE_FRAME_MS } from "@/constants/characters";
import HomeNoTeamView from "@/features/home/HomeNoTeamView";
import NapProposalSheet from "@/features/team/NapProposalSheet";
import Toast from "@/components/Toast";

/**
 * ホーム（Figma S02-01_Home, node 733:4460）。
 *
 * 湖畔のイラストを全面に敷き、上部だけ白いスクリムで抜いて見出しを読ませる。
 * 数値やメンバー一覧を並べるのではなく「日付 → 見出し → スコア → AIアドバイス
 * → ステータスチップ」までを上段にまとめ、下段は猫と2つのCTAだけにする。
 *
 * チーム未加入(solo)ではチーム由来のブロックを出さない、在席は WebSocket の
 * スナップショットを優先する、という挙動はそのまま維持している。
 */

const SCREEN_PADDING = 32;
const CAT_SIZE = 252;

export default function HomeScreen() {
  const router = useRouter();
  const { data, loading, error } = useHomeSummary();
  const { memberStatus: liveMemberStatus } = useRealtimeMembers();
  const { data: restRecommendation } = useRestRecommendation();
  const [proposalOpen, setProposalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const summary = data?.summary;

  // Solo accounts never see team score / members / free-slot blocks.
  const hasTeam = summary?.hasTeam ?? false;

  // Prefer the live presence snapshot (WebSocket) over the fetched one.
  const memberStatus =
    hasTeam && liveMemberStatus ? liveMemberStatus : data?.memberStatus;

  // チーム未参加は専用レイアウト（Figma S02-05_Home_NoTeam）。
  // summary が来るまでは判定できないので、確定してから切り替える。
  if (summary && !hasTeam) {
    return (
      <HomeNoTeamView summary={summary} loading={loading} error={error} />
    );
  }

  const restingCount = memberStatus?.memberStatusCounts.resting ?? 0;
  const nextFree = summary?.nextFree ?? null;

  // On a short browser window the fixed layout would clip the CTAs. Drop
  // the status chips to buy vertical room; the ScrollView catches the rest.
  const { height: windowHeight } = useWindowDimensions();
  const compact = Platform.OS === "web" && windowHeight < 760;

  return (
    <SceneBackground
      source={require("../../../assets/backgrounds/home-day.png")}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Grows to fill on a tall screen, scrolls on a short one. */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.top}>
            {/* Header */}
            <View style={styles.header}>
              <Logo width={72} color={colors.primary} />
              <NotificationBell size={28} />
            </View>

            {/* Greeting */}
            <View style={styles.greeting}>
              <Text style={styles.dateLabel}>
                {summary?.todayLabel ?? "読み込み中"}
              </Text>
              <Text style={styles.headline}>
                {(summary?.headline ?? ["今日のチームは", "確認中です"]).join(
                  "\n",
                )}
              </Text>
            </View>

            {/* チームの状態 — チーム加入時のみ */}
            {hasTeam ? (
              <View style={styles.teamState}>
                <Text style={styles.caption}>チームの状態</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreValue}>
                    {summary?.teamScore ?? "--"}
                  </Text>
                  <Text style={styles.scoreUnit}>/{TEAM_SCORE_MAX}</Text>
                </View>
              </View>
            ) : null}

            {/* AIアドバイス — 遷移ボタンではなく、この場に本文が出る枠 */}
            {hasTeam ? (
              <Text style={styles.adviceText}>
                {summary?.aiAdvice ?? "AIアドバイスを読み込み中"}
              </Text>
            ) : null}

            {/* Status Chips — hidden on a cramped web window (see `compact`). */}
            {!compact ? (
              <View style={styles.chips}>
                {hasTeam ? (
                  <StatusPill
                    label={`${restingCount}人がひとやすみ中`}
                    icon={<UsersThreeIcon size={16} color={colors.primary} />}
                  />
                ) : null}
                {nextFree ? (
                  <StatusPill
                    label={`${nextFree.start}ごろ休めそう`}
                    icon={<TimerIcon size={16} color={colors.primary} />}
                  />
                ) : null}
              </View>
            ) : null}

            {/* 個人向け休息提案（上流 PR #33） */}
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
          </View>

          <View style={styles.spacer} />

          {/* Figma の猫は 5 コマループのインスタンス（node 659:3765） */}
          <SpriteLoop
            frames={CAT_IDLE_FRAMES}
            size={CAT_SIZE}
            frameDurationMs={CAT_IDLE_FRAME_MS}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <PillButton
              variant="primary"
              label="仮眠する"
              onPress={() => router.push("/rest")}
              icon={<MoonStarsIcon size={24} color={colors.white} />}
              elevated={false}
              style={styles.primaryAction}
              textStyle={styles.primaryActionLabel}
            />

            <PillButton
              variant="outline"
              label={hasTeam ? "みんなを誘う" : "チームに参加する"}
              onPress={
                hasTeam
                  ? () => setProposalOpen(true)
                  : () => router.push("/team/join")
              }
              icon={<UsersThreeIcon size={20} color={colors.primary} />}
              hitSlop={{ top: 4, bottom: 4 }}
              style={styles.secondaryAction}
              textStyle={styles.secondaryActionLabel}
            />

            <View style={styles.footer}>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* チーム画面と同じ提案シート（OV-01 → OV-02） */}
      <NapProposalSheet
        visible={proposalOpen}
        slotNote={
          nextFree
            ? `${nextFree.start}〜${nextFree.end} ・ ${nextFree.availableMemberCount}人が予定なし`
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
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 22,
  },
  top: {
    width: "100%",
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    gap: 6,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  headline: {
    fontSize: 32,
    lineHeight: 43,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  teamState: {
    gap: 2,
  },
  caption: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  scoreValue: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  scoreUnit: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textTertiary,
  },
  adviceText: {
    width: "100%",
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
    paddingTop: 6,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 8,
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
  actions: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  primaryAction: {
    width: 274,
    height: 64,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryActionLabel: {
    fontSize: 20,
    lineHeight: 30,
  },
  secondaryAction: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    paddingVertical: 0,
  },
  secondaryActionLabel: {
    fontSize: 14,
    color: colors.primary,
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
