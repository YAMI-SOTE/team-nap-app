import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { suggestTeamNap } from "@/services/team";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { CheckCircleIcon } from "@/components/icons";

const DURATIONS = [15, 20, 30];

type Phase = "pick" | "sending" | "sent";

type NapProposalSheetProps = {
  visible: boolean;
  defaultMinutes?: number;
  /** e.g. "14:30〜14:45 ・ 6人中5人が予定なし" */
  slotNote?: string;
  onClose: () => void;
  /** Called after a successful send, once the user dismisses the sheet. */
  onSent: (minutes: number, notified: number) => void;
};

/**
 * Bottom sheet for "◯分仮眠を提案" (Figma S04 BottomSheet 336:2047 →
 * 336:2063). Pick a duration → POST /teams/nap-suggestion → success state.
 */
export default function NapProposalSheet({
  visible,
  defaultMinutes = 15,
  slotNote,
  onClose,
  onSent,
}: NapProposalSheetProps) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [notified, setNotified] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPhase("pick");
      setMinutes(defaultMinutes);
      setError(null);
    }
  }, [visible, defaultMinutes]);

  const handleSend = async () => {
    setPhase("sending");
    setError(null);
    try {
      const res = await suggestTeamNap(minutes);
      setNotified(res.notified);
      setPhase("sent");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "提案を送信できませんでした",
      );
      setPhase("pick");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={phase === "pick" ? onClose : undefined}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.handle} />

            {phase === "sent" ? (
              <View style={styles.sentBlock}>
                <View style={styles.checkCircle}>
                  <CheckCircleIcon size={34} color={colors.primary} />
                </View>
                <Text style={styles.title}>提案を送りました</Text>
                <Text style={styles.subtitle}>
                  チームの{notified}人にお知らせしました。{"\n"}
                  みんなの通知に届きます。
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => onSent(minutes, notified)}
                >
                  <Text style={styles.primaryButtonText}>閉じる</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.title}>
                  みんなで{minutes}分の仮眠はどうですか？
                </Text>
                {slotNote ? (
                  <Text style={styles.subtitle}>{slotNote}</Text>
                ) : null}

                <View style={styles.durationRow}>
                  {DURATIONS.map((d) => {
                    const active = d === minutes;
                    return (
                      <Pressable
                        key={d}
                        style={[
                          styles.durationChip,
                          active && styles.durationChipActive,
                        ]}
                        onPress={() => setMinutes(d)}
                        disabled={phase === "sending"}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            active && styles.durationTextActive,
                          ]}
                        >
                          {d}分
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={[
                    styles.primaryButton,
                    phase === "sending" && styles.disabled,
                  ]}
                  onPress={handleSend}
                  disabled={phase === "sending"}
                >
                  {phase === "sending" ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>この時間で提案する</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={phase === "sending"}
                >
                  <Text style={styles.cancelText}>キャンセル</Text>
                </Pressable>
              </>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(7,30,36,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.lg,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  durationChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brandSubtle,
  },
  durationText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  durationTextActive: {
    color: colors.textBrand,
  },
  primaryButton: {
    marginTop: spacing.lg,
    borderRadius: 999,
    paddingVertical: 14,
    minHeight: 47,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: "700",
  },
  error: {
    marginTop: spacing.sm,
    color: colors.error,
    fontSize: 12,
    textAlign: "center",
  },
  sentBlock: {
    alignItems: "center",
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSubtle,
    marginBottom: spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
});
