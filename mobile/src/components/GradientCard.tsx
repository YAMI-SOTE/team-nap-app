import type { PropsWithChildren } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * A rounded container filled edge-to-edge with a linear gradient.
 * Wraps `expo-linear-gradient` so the fill always tracks the container
 * size (no manual measurement). `overflow: hidden` clips it to the
 * rounded corners.
 */

type GradientCardProps = PropsWithChildren<{
  /** Gradient stop colors, start → end (2 or more). */
  colors: readonly string[];
  /** Gradient direction in unit-square coords. Default: top-left → bottom-right. */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
}>;

export default function GradientCard({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={start}
      end={end}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
});
