import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { radius } from "@/theme/spacing";

type IconPillProps = PropsWithChildren<{
  /** Leading icon node, e.g. `<TrophyIcon size={22} />`. */
  icon: ReactNode;
  backgroundColor: string;
  /** Gap between the icon and the content. */
  gap?: number;
  style?: ViewStyle;
}>;

/**
 * Pill-shaped row with a leading icon and free-form content.
 * Used for the Team screen status pills (現在の状態) and the
 * achievement banner (今週の達成).
 */
export default function IconPill({
  icon,
  backgroundColor,
  gap = 8,
  style,
  children,
}: IconPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor, gap }, style]}>
      {icon}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});
