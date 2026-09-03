import { useState } from "react";
import {
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { colors } from "@/theme/colors";

type LineChartProps = {
  /**
   * One value per point. `null` (or `undefined`) is a gap — no marker and
   * no line segment through it (used for days that have not happened yet).
   * Auto-normalized unless a domain is given.
   */
  values: Array<number | null | undefined>;
  /** X-axis labels, rendered under the plot. */
  labels: string[];
  height?: number;
  /** Fix the vertical scale (e.g. a 0–100 score) instead of min/max of the data. */
  domainMin?: number;
  domainMax?: number;
};

/**
 * Small weekly line chart — a brand polyline with dot markers and a
 * highlighted last point (Figma "Plot", node 272:776). Gaps in `values`
 * (null) break the line and are left unplotted.
 */
export default function LineChart({
  values,
  labels,
  height = 72,
  domainMin,
  domainMax,
}: LineChartProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const padX = width * 0.06;
  const bandTop = height * 0.28;
  const bandBottom = height * 0.28;
  const usableW = Math.max(width - padX * 2, 0);
  const usableH = Math.max(height - bandTop - bandBottom, 0);

  const numeric = values.filter((v): v is number => typeof v === "number");
  const min = domainMin ?? (numeric.length ? Math.min(...numeric) : 0);
  const max = domainMax ?? (numeric.length ? Math.max(...numeric) : 1);
  const span = max - min || 1;

  // One slot per value; `y` is null for gaps. `x` is always kept so the
  // plotted points stay aligned with their day labels.
  const slots = values.map((v, i) => {
    const x =
      padX + (values.length > 1 ? (i / (values.length - 1)) * usableW : 0);
    const y =
      typeof v === "number"
        ? bandTop + (1 - (v - min) / span) * usableH
        : null;
    return { x, y, index: i };
  });

  const drawn = slots.filter(
    (s): s is { x: number; y: number; index: number } => s.y !== null,
  );
  const lastDrawnIndex = drawn.length ? drawn[drawn.length - 1].index : -1;

  // Split into continuous runs so a gap breaks the polyline.
  const segments: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  for (const s of slots) {
    if (s.y === null) {
      if (run.length) segments.push(run);
      run = [];
    } else {
      run.push({ x: s.x, y: s.y });
    }
  }
  if (run.length) segments.push(run);

  return (
    <View>
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {segments.map((seg, i) => (
              <Polyline
                key={`seg-${i}`}
                points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {drawn.map((p) => {
              const last = p.index === lastDrawnIndex;
              return (
                <Circle
                  key={p.index}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={last ? colors.primary : colors.white}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.days}>
        {labels.map((label, i) => (
          <Text key={`${label}-${i}`} style={styles.day}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
});
