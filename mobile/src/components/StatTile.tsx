import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type StatTileProps = {
  icon: ReactNode;
  value: string;
  /** Small unit suffix, e.g. "回" / "分". */
  unit?: string;
  label: string;
};

/**
 * A compact metric card — icon, big value (+ optional unit), caption
 * (Figma "Metrics" tiles, nodes 271:788 / 274:852).
 */
export default function StatTile({ icon, value, unit, label }: StatTileProps) {
  return (
    <View style={styles.tile}>
      {icon}
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
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
