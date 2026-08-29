import { useId } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/theme/colors";

type AuraProps = {
  /** Diameter of the glow in px. */
  size?: number;
  /** Glow color (fades to transparent at the edge). */
  color?: string;
  /** Opacity at the center. */
  intensity?: number;
  /** Absolute offset from the parent edges. */
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  style?: ViewStyle;
};

/**
 * Soft brand-tinted glow used as a screen backdrop (Figma "Aura", a 48px
 * blur). Approximated with a radial gradient — react-native-svg blur
 * filters are not reliably supported across platforms.
 */
export default function Aura({
  size = 360,
  color = colors.brandSubtle,
  intensity = 0.9,
  top = -70,
  right,
  left,
  bottom,
  style,
}: AuraProps) {
  // Sanitize: React's useId() contains ":" which is invalid in an SVG id / url(#…).
  const gradientId = `aura-${useId().replace(/:/g, "")}`;
  // Anchor to the right edge by default, unless a left offset is given.
  const resolvedRight = right ?? (left === undefined ? -110 : undefined);

  return (
    <Svg
      width={size}
      height={size}
      pointerEvents="none"
      style={[styles.aura, { top, right: resolvedRight, left, bottom }, style]}
    >
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={intensity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2}
        fill={`url(#${gradientId})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  aura: {
    position: "absolute",
  },
});
