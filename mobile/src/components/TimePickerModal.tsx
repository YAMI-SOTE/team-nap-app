import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import PillButton from "@/components/PillButton";

type TimePickerModalProps = {
  visible: boolean;
  /** Current value as "HH:MM". */
  value: string;
  title?: string;
  /** Minute step for the +/- controls. Default 5. */
  minuteStep?: number;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

function parse(value: string): { h: number; m: number } {
  const [h, m] = value.split(":").map((part) => Number.parseInt(part, 10));
  return {
    h: Number.isFinite(h) ? Math.min(Math.max(h, 0), 23) : 0,
    m: Number.isFinite(m) ? Math.min(Math.max(m, 0), 59) : 0,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");
const wrap = (n: number, mod: number) => ((n % mod) + mod) % mod;

/**
 * Lightweight time picker — a bottom sheet with stepper controls for
 * hours and minutes. Uses only the built-in RN `Modal` so it works the
 * same on iOS, Android and web with no extra dependency.
 */
export default function TimePickerModal({
  visible,
  value,
  title,
  minuteStep = 5,
  onCancel,
  onConfirm,
}: TimePickerModalProps) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  // Re-seed the draft each time the sheet opens.
  useEffect(() => {
    if (visible) {
      const parsed = parse(value);
      setH(parsed.h);
      setM(Math.round(parsed.m / minuteStep) * minuteStep % 60);
    }
  }, [visible, value, minuteStep]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        {title ? <Text style={styles.title}>{title}</Text> : null}

        <View style={styles.pickerRow}>
          <Stepper
            label="時"
            display={pad(h)}
            onDecrement={() => setH((prev) => wrap(prev - 1, 24))}
            onIncrement={() => setH((prev) => wrap(prev + 1, 24))}
          />
          <Text style={styles.colon}>:</Text>
          <Stepper
            label="分"
            display={pad(m)}
            onDecrement={() => setM((prev) => wrap(prev - minuteStep, 60))}
            onIncrement={() => setM((prev) => wrap(prev + minuteStep, 60))}
          />
        </View>

        <View style={styles.actions}>
          <PillButton
            variant="outline"
            label="キャンセル"
            onPress={onCancel}
            textStyle={styles.actionText}
            style={styles.actionButton}
          />
          <PillButton
            variant="primary"
            label="決定"
            elevated={false}
            onPress={() => onConfirm(`${pad(h)}:${pad(m)}`)}
            textStyle={styles.actionText}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

function Stepper({
  label,
  display,
  onDecrement,
  onIncrement,
}: {
  label: string;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onDecrement}
        accessibilityRole="button"
        accessibilityLabel={`${label}を減らす`}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{display}</Text>
      <Pressable
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel={`${label}を増やす`}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepButtonText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18,41,44,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 20,
  },
  title: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  colon: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  stepper: {
    alignItems: "center",
    gap: 10,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.textBrand,
  },
  stepValue: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    minWidth: 56,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 47,
    minHeight: 47,
  },
  actionText: {
    fontSize: 14,
  },
});
