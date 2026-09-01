import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  /** Shown after the first confirm tap when `doubleConfirm`. */
  confirmAgainLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  /** Require two taps of the confirm button before firing `onConfirm`. */
  doubleConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Centered modal confirmation. With `doubleConfirm`, the confirm button
 * arms on the first tap (label switches, warning shown) and only fires
 * `onConfirm` on the second — used for logout and account deletion.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  confirmAgainLabel = "本当に実行する",
  cancelLabel = "キャンセル",
  destructive = false,
  loading = false,
  doubleConfirm = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [armed, setArmed] = useState(false);

  // Reset the armed state whenever the dialog is re-opened.
  useEffect(() => {
    if (!visible) setArmed(false);
  }, [visible]);

  const handleConfirm = () => {
    if (loading) return;
    if (doubleConfirm && !armed) {
      setArmed(true);
      return;
    }
    onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    setArmed(false);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={handleCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {doubleConfirm && armed ? (
            <Text style={styles.armedWarning}>
              この操作は取り消せません。もう一度タップして確定してください。
            </Text>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            disabled={loading}
            style={[
              styles.confirmButton,
              destructive ? styles.confirmDestructive : styles.confirmPrimary,
              loading && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.confirmText}>
                {doubleConfirm && armed ? confirmAgainLabel : confirmLabel}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleCancel}
            disabled={loading}
            style={styles.cancelButton}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(7,30,36,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  armedWarning: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
  confirmButton: {
    marginTop: spacing.sm,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  confirmPrimary: {
    backgroundColor: colors.primary,
  },
  confirmDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelText: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
