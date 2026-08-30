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
  /** One value per point (any scale); the line is auto-normalized. */
  values: number[];
  /** X-axis labels, rendered under the plot. */
  labels: string[];
  height?: number;
};

/**
 * Small weekly line chart — a brand polyline with dot markers and a
 * highlighted last point (Figma "Plot", node 272:776).
 */
export default function LineChart({
  values,
  labels,
  height = 72,
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

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const x = padX + (values.length > 1 ? (i / (values.length - 1)) * usableW : 0);
    const y = bandTop + (1 - (v - min) / span) * usableH;
    return { x, y };
  });

  return (
    <View>
      <View style={{ height }} onLayout={onLayout}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => {
              const last = i === points.length - 1;
              return (
                <Circle
                  key={i}
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
