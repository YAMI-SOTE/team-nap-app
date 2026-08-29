import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

export type WeeklyBarState = "past" | "today" | "future";

export type WeeklyBarDatum = {
  /** Weekday label shown under the bar. */
  label: string;
  /** Fill height as a 0–1 fraction of the track. */
  ratio: number;
  state: WeeklyBarState;
};

type WeeklyBarChartProps = {
  days: WeeklyBarDatum[];
  trackHeight?: number;
  barWidth?: number;
  style?: ViewStyle;
};

/**
 * The 7-day "WeeklyChart" from the Team screen hero (Figma 265:621):
 * a pill track per day with a bottom-anchored fill.
 */
export default function WeeklyBarChart({
  days,
  trackHeight = 52,
  barWidth = 22,
  style,
}: WeeklyBarChartProps) {
  return (
    <View style={[styles.row, style]}>
      {days.map((day, index) => {
        const isToday = day.state === "today";
        const barHeight = Math.max(
          6,
          Math.round(Math.min(Math.max(day.ratio, 0), 1) * trackHeight),
        );

        return (
          <View key={`${day.label}-${index}`} style={styles.column}>
            <View
              style={[
                styles.track,
                { height: trackHeight, width: barWidth },
              ]}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: BAR_COLOR[day.state],
                    opacity: day.state === "past" ? 0.55 : 1,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.label, isToday && styles.labelToday]}
              numberOfLines={1}
            >
              {day.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const BAR_COLOR: Record<WeeklyBarState, string> = {
  past: colors.primary,
  today: colors.brandStrong,
  future: colors.borderSubtle,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  column: {
    alignItems: "center",
    gap: 6,
  },
  track: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  labelToday: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
