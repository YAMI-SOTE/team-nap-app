import Svg, { Circle } from "react-native-svg";

import { colors } from "@/theme/colors";

type RingGaugeProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
};

/**
 * Circular progress ring (Figma "Gauge", node 285:973). A full track ring
 * with a rounded brand arc for the current value.
 */
export default function RingGauge({
  value,
  max = 100,
  size = 76,
  strokeWidth = 9,
  color = colors.primary,
  trackColor = colors.surfaceSunken,
}: RingGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const center = size / 2;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </Svg>
  );
}
