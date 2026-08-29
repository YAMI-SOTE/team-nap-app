import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CaretRightIcon } from "@/components/icons";

type FieldRowProps = {
  label: string;
  value: string;
  onPress?: () => void;
};

/**
 * A form row inside a card: a regular label, a bold value, and a chevron
 * (Figma "日付 / 開始 / 終了", node 307:1738). Dividers between rows are
 * supplied by the parent (e.g. `Hairline`).
 */
export default function FieldRow({ label, value, onPress }: FieldRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${label} ${value}` : undefined}
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {onPress ? (
        <CaretRightIcon size={18} color={colors.textTertiary} />
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  value: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
