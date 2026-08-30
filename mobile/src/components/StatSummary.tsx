import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import Card from "@/components/Card";

export type StatSummaryItem = {
  value: string;
  /** Small unit suffix, e.g. "回" / "分". */
  unit?: string;
  label: string;
};

type StatSummaryProps = {
  items: StatSummaryItem[];
};

/**
 * A single card holding several centered value/label columns — the
 * summary bar at the top of the nap-history screen (Figma "Summary",
 * node 276:918).
 */
export default function StatSummary({ items }: StatSummaryProps) {
  return (
    <Card style={styles.card}>
      {items.map((item) => (
        <View key={item.label} style={styles.column}>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{item.value}</Text>
            {item.unit ? <Text style={styles.unit}>{item.unit}</Text> : null}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 14,
  },
  column: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  value: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
});
