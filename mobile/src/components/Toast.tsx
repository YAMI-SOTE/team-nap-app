import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CheckCircleIcon } from "@/components/icons";

type ToastProps = {
  visible: boolean;
  message: string;
  onHide: () => void;
  durationMs?: number;
};

/** Small auto-dismissing confirmation pill, anchored near the bottom. */
export default function Toast({
  visible,
  message,
  onHide,
  durationMs = 2200,
}: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(onHide, durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, onHide]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.pill}>
        <CheckCircleIcon size={20} color={colors.white} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.textPrimary,
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
