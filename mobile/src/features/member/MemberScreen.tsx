import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useMemberDetail } from "@/hooks/useMemberDetail";
import { sendRestNudge, sendWakeNudge } from "@/services/team";
import AppBackground from "@/components/AppBackground";
import MenuBar from "@/components/MenuBar";
import ScreenHeader from "@/components/ScreenHeader";
import MemberProfileHeader from "@/components/MemberProfileHeader";
import StatCard from "@/components/StatCard";
import PillButton from "@/components/PillButton";
import type { MemberStatus } from "@/components/MemberAvatar";
import { BellIcon, ClockUserIcon, HeartIcon, InfoIcon } from "@/components/icons";

export default function MemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error } = useMemberDetail(id);

  const [nudging, setNudging] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

  const nudge = async (kind: "wake" | "rest") => {
    if (!id || nudging) return;
    setNudging(true);
    setNudgeMessage(null);
    try {
      await (kind === "wake" ? sendWakeNudge(id) : sendRestNudge(id));
      setNudgeMessage(
        kind === "wake"
          ? "「起きて〜」を送信しました"
          : "「休んでね」を送信しました",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setNudgeMessage(
        /409/.test(message)
          ? "相手が「起こしてもらう」をOFFにしています"
          : "送信できませんでした",
      );
    } finally {
      setNudging(false);
    }
  };

  const handleRest = () => nudge("rest");
  const handleWake = () => nudge("wake");

  const wakeAssistEnabled = data?.wakeSupport.wakeAssistEnabled ?? false;
  const isResting = data?.status === "resting";
  const supportCaption = !isResting
    ? "集中を邪魔しない軽い通知が届きます"
    : wakeAssistEnabled
      ? "タップすると軽い通知が届きます"
      : "起こしてもらう設定はOFFです。そっと見守りましょう。";

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="メンバー" onBack={() => router.back()} />

          {!data ? (
            <View style={styles.stateBlock}>
              {loading ? <ActivityIndicator color={colors.primary} /> : null}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          ) : (
            <View style={styles.main}>
              <MemberProfileHeader
                name={data.name}
                status={data.status as MemberStatus}
              />

              {data.nap ? (
                <StatCard
                  icon={<ClockUserIcon size={24} color={colors.white} />}
                  label="起きる予定"
                  value={data.nap.wakeAt}
                  hint={`あと${data.nap.minutesRemaining}分`}
                />
              ) : null}

              {/*
                起床サポート。Figma は状態ごとに出すものが違う:
                - 仮眠中 + 起こしてもらうON（S04-03）… 注意書き + 2ボタン
                - 仮眠中 + 起こしてもらうOFF（S04-05）… キャプションのみ
                - 作業中/オフライン（S04-04）…「休んでね」だけを全幅で
              */}
              <View style={styles.supportCard}>
                {isResting && wakeAssistEnabled ? (
                  <>
                    <View style={styles.noteRow}>
                      <InfoIcon size={18} color={colors.borderBrand} />
                      <Text style={styles.noteText}>
                        本人が「起こしてもらう」をONにしています
                      </Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <PillButton
                        variant="outline"
                        label="休んでね"
                        onPress={handleRest}
                        disabled={nudging}
                        icon={<HeartIcon size={20} color={colors.textBrand} />}
                        textStyle={styles.outlineActionText}
                        style={styles.actionButton}
                      />
                      <PillButton
                        variant="primary"
                        label="起きて〜"
                        onPress={handleWake}
                        disabled={nudging}
                        elevated={false}
                        icon={<BellIcon size={24} color={colors.white} />}
                        style={styles.actionButton}
                      />
                    </View>
                  </>
                ) : isResting ? null : (
                  <PillButton
                    variant="outline"
                    label="休んでね"
                    onPress={handleRest}
                    disabled={nudging}
                    icon={<HeartIcon size={20} color={colors.textBrand} />}
                    style={styles.actionButton}
                  />
                )}

                <Text style={styles.supportCaption}>
                  {nudgeMessage ?? supportCaption}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      {/* MenuBar 自身が Figma の pb24（ホームインジケーター分）を持つ */}
      <MenuBar activeTab="team" />
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
    flexGrow: 1,
    paddingHorizontal: 24,
    // Figma: Content pt63 − ステータスバー 47 ＝ セーフエリア下 16px
    paddingTop: 16,
    paddingBottom: 16,
    gap: 20,
  },
  stateBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.error,
    textAlign: "center",
  },
  main: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },

  // 起床サポート（node 733:4917）
  // Figma では塗りが無く、注意書き・ボタン・キャプションが
  // そのまま背景の上に載る。余白だけカードと同じ 18/16 を持つ。
  supportCard: {
    width: "100%",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textBrand,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 47,
    minHeight: 47,
  },
  outlineActionText: {
    fontSize: 14,
  },
  supportCaption: {
    // Figma: Micro/Medium — 11px / 1.5
    width: "100%",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "500",
    color: colors.textTertiary,
    textAlign: "center",
  },
});
