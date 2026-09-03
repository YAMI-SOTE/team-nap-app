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
import { useStats } from "@/hooks/useStats";
import SceneBackground from "@/components/SceneBackground";
import StatusPill from "@/components/StatusPill";
import Logo from "@/components/Logo";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import { MoonStarsIcon, TimerIcon, UsersThreeIcon } from "@/components/icons";

import type { HomeSummaryResponse } from "@/types/api";

/**
 * ホーム（チーム未参加）— Figma S02-05_Home_NoTeam, node 971:3758。
 *
 * S02-01 との違いは4点:
 *  - 見出しが「今日もおつかれさま」の1行
 *  - チームスコアではなく「あなたの仮眠スコア」（個人統計の score）
 *  - ステータスチップは「◯◯ごろ休めそう」だけ
 *  - 「チームに入ると…」のバナーと、CTA が「チームをつくる・参加する」
 *
 * 個人スコアは `/stats` にしか無いので、このビューだけで取りに行く
 * （チーム加入済みのユーザーには余計なリクエストを飛ばさない）。
 */

const SCREEN_PADDING = 32;
const CAT_SIZE = 230;

type HomeNoTeamViewProps = {
  summary?: HomeSummaryResponse;
  loading: boolean;
  error: string | null;
};

export default function HomeNoTeamView({
  summary,
  loading,
  error,
}: HomeNoTeamViewProps) {
  const router = useRouter();
  const { personal } = useStats();

  const nextFree = summary?.nextFree ?? null;
  const goToTeam = () => router.push("/team/join");

  return (
    <SceneBackground
      source={require("../../../assets/backgrounds/home-day.png")}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Fixed, non-scrolling — sized to one screen. */}
        <View style={styles.content}>
          <View style={styles.top}>
            <View style={styles.header}>
              <Logo width={72} color={colors.primary} />
              <NotificationBell size={28} />
            </View>

            <View style={styles.greeting}>
              <Text style={styles.dateLabel}>
                {summary?.todayLabel ?? "読み込み中"}
              </Text>
              <Text style={styles.headline}>今日もおつかれさま</Text>
            </View>

            {/* あなたの仮眠スコア（個人統計） */}
            <View style={styles.scoreBlock}>
              <Text style={styles.caption}>あなたの仮眠スコア</Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreValue}>{personal?.score ?? "--"}</Text>
                <Text style={styles.scoreUnit}>
                  /{personal?.scoreMax ?? 100}
                </Text>
              </View>
            </View>

            {/* AIアドバイス — 遷移ボタンではなく、この場に本文が出る枠 */}
            <Text style={styles.adviceText}>
              {summary?.aiAdvice ?? "AIアドバイスを読み込み中"}
            </Text>

            {nextFree ? (
              <View style={styles.chips}>
                <StatusPill
                  label={`${nextFree.start}ごろ休めそう`}
                  icon={<TimerIcon size={16} color={colors.primary} />}
                />
              </View>
            ) : null}

            {/* Banner / チーム未参加（node 971:3817） */}
            <Pressable
              onPress={goToTeam}
              accessibilityRole="button"
              style={styles.banner}
            >
              <UsersThreeIcon size={20} color={colors.primary} />
              <Text style={styles.bannerText}>
                チームに入ると、みんなで休みやすくなります
              </Text>
            </Pressable>
          </View>

          <View style={styles.spacer} />

          {/* Figma「Cat / NoTeam」(node 971:3822) は静止画。
              ホームの待機ループとは別アセット。 */}
          <Image
            source={require("../../../assets/characters/cat-noteam.png")}
            style={styles.cat}
            resizeMode="contain"
            accessible={false}
          />

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
              label="チームをつくる・参加する"
              onPress={goToTeam}
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
        </View>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  scoreBlock: {
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
    paddingTop: 6,
  },
  banner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 8,
  },
  cat: {
    width: CAT_SIZE,
    height: CAT_SIZE,
    // Figma は Actions の 8px 上（node 971:3822, bottom 148 / Actions 140）。
    marginBottom: 8,
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
    width: 244,
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
