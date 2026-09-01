import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CrownSimpleIcon } from "@/components/icons";

export type Rank = 1 | 2 | 3;

const SIZE = 28;

// gold / silver / bronze — nearest existing theme tokens.
const RANK_COLOR: Record<Rank, string> = {
  1: colors.accentGold,
  2: colors.borderStrong,
  3: colors.accentCoral,
};

/**
 * Podium crown with the rank number inside — the "Rank 1/2/3" element in
 * the 今週の仮眠上手 card (Figma node 258:590).
 */
export default function RankBadge({ rank }: { rank: Rank }) {
  return (
    <View style={styles.badge} accessible accessibilityLabel={`${rank}位`}>
      <CrownSimpleIcon size={SIZE} color={RANK_COLOR[rank]} />
      <Text style={styles.rank}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
    position: "absolute",
    top: SIZE * 0.28,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
});
