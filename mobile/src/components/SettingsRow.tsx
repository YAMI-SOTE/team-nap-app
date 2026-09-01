import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CaretRightIcon } from "@/components/icons";

type SettingsRowProps = {
  label: string;
  /** Makes the row a button; shows a caret unless `trailing` is given. */
  onPress?: () => void;
  /** Custom trailing element (e.g. a `<Toggle>`). */
  trailing?: ReactNode;
  /** Render the label in the danger colour (e.g. ログアウト). */
  danger?: boolean;
  /** Show the 1px bottom divider. Default true. */
  divider?: boolean;
};

/**
 * A single settings line — label plus a trailing control — with a hair
 * divider beneath (Figma "SettingsRow", node 237:332 / 237:338).
 */
export default function SettingsRow({
  label,
  onPress,
  trailing,
  danger = false,
  divider = true,
}: SettingsRowProps) {
  const Container = onPress ? Pressable : View;
  const resolvedTrailing =
    trailing ?? (onPress ? <CaretRightIcon size={16} /> : null);

  return (
    <View style={styles.wrap}>
      <Container
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        style={styles.row}
      >
        <Text
          style={[styles.label, danger && styles.labelDanger]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {resolvedTrailing}
      </Container>
      {divider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  labelDanger: {
    color: colors.textDanger,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.surfaceSunken,
  },
});
