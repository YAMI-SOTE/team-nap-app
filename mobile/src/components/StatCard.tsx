import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import Card from "@/components/Card";

type StatCardProps = {
  /** Icon node rendered inside the circular badge. */
  icon: ReactNode;
  label: string;
  value: string;
  /** Optional secondary text next to the value (e.g. "あと10分"). */
  hint?: string;
  /** Circular badge color. Defaults to the brand color. */
  iconBackground?: string;
  style?: ViewStyle;
};

/**
 * White card with a circular icon badge and a label / value row
 * (Figma "Card / 仮眠の状況", node 269:643).
 */
export default function StatCard({
  icon,
  label,
  value,
  hint,
  iconBackground = colors.primary,
  style,
}: StatCardProps) {
  return (
    <Card style={StyleSheet.flatten([styles.card, style])}>
      <View style={[styles.badge, { backgroundColor: iconBackground }]}>
        {icon}
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  hint: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
