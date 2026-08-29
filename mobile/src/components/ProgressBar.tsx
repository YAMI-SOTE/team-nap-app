import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

type ProgressBarProps = {
  /** Current value. */
  value: number;
  /** Value that represents a full bar. Defaults to 100. */
  max?: number;
  /** Fill color. Defaults to the brand color. */
  color?: string;
  /** Track (background) color. */
  trackColor?: string;
  /** Bar thickness in px. */
  height?: number;
  style?: ViewStyle;
};

/**
 * Thin rounded progress bar (Figma "Progress" / "Bar").
 */
export default function ProgressBar({
  value,
  max = 100,
  color = colors.primary,
  trackColor = colors.surfaceSunken,
  height = 3,
  style,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius.pill, backgroundColor: trackColor },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${ratio * 100}%`,
            borderRadius: radius.pill,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
