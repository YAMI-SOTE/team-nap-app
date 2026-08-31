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
import AuroraBackdrop from "@/components/AuroraBackdrop";
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

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
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

              <View style={styles.supportCard}>
                <View style={styles.noteRow}>
                  <InfoIcon size={18} color={colors.borderBrand} />
                  <Text style={styles.noteText}>
                    {wakeAssistEnabled
                      ? "本人が「起こしてもらう」をONにしています"
                      : "本人が「起こしてもらう」をOFFにしています"}
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
                    disabled={!wakeAssistEnabled || nudging}
                    elevated={false}
                    icon={<BellIcon size={24} color={colors.white} />}
                    style={styles.actionButton}
                  />
                </View>

                <Text style={styles.supportCaption}>
                  {nudgeMessage ?? "タップすると軽い通知が届きます"}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <SafeAreaView edges={["bottom"]} style={styles.menuSafeArea}>
        <MenuBar activeTab="team" />
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 20,
  },
  menuSafeArea: {
    backgroundColor: colors.surface,
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

  // 起床サポート
  supportCard: {
    width: "100%",
    backgroundColor: colors.brandSubtle,
    borderRadius: 16,
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
    width: "100%",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
    textAlign: "center",
  },
});
