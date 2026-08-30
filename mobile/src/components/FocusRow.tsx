import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type FocusRowProps = {
  label: string;
  before: number;
  after: number;
  /** Improvement in points (shown as "+Npt"). */
  deltaPt: number;
};

/**
 * "仮眠前後の集中度  62 → 82 +20pt" — the before/after focus line shared
 * by the personal and team stats cards (Figma nodes 271:780 / 281:1026).
 */
export default function FocusRow({
  label,
  before,
  after,
  deltaPt,
}: FocusRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.values}>
        <Text style={styles.before}>{before}</Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.after}>{after}</Text>
        <Text style={styles.delta}>+{deltaPt}pt</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  values: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
    gap: 6,
  },
  before: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  arrow: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  after: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textBrand,
  },
  delta: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
