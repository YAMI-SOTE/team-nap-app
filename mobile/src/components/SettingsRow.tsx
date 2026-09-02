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
  /**
   * 行の高さの取り方。Figma では末尾がキャレットの行は上下 8px の余白を持ち、
   * トグルの行は余白なし（トグル自身の 31px が高さを決める）で、
   * 区切り線までの間隔も 8 / 11.5 と differ する（node 733:4254 / 733:4261）。
   */
  variant?: "link" | "control";
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
  variant = "link",
}: SettingsRowProps) {
  const isControl = variant === "control";
  const Container = onPress ? Pressable : View;
  const resolvedTrailing =
    trailing ?? (onPress ? <CaretRightIcon size={16} /> : null);

  return (
    <View style={[styles.wrap, isControl && styles.wrapControl]}>
      <Container
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        style={[styles.row, isControl && styles.rowControl]}
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
  wrapControl: {
    gap: 11.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  rowControl: {
    paddingVertical: 0,
    minHeight: 31,
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
