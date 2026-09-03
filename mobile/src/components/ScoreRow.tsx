import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import MemberAvatar from "@/components/MemberAvatar";
import RankBadge, { type Rank } from "@/components/RankBadge";

import type { HomeMemberStatus } from "@/types/api";

type ScoreRowProps = {
  name: string;
  status: HomeMemberStatus;
  score: number;
  /** The member's chosen avatar id, or null → default icon seeded by `seed`. */
  avatarId?: string | null;
  /** Seed for the default icon when `avatarId` is null (usually the member id). */
  seed?: string;
  /** 1–3 shows a podium crown badge before the avatar. */
  rank?: Rank;
  onPress?: () => void;
};

/**
 * One member line in 仮眠上手ランキング: optional rank badge, avatar,
 * name, and the rest score (Figma "Row / メンバーX", node 258:589).
 */
export default function ScoreRow({
  name,
  status,
  score,
  avatarId,
  seed,
  rank,
  onPress,
}: ScoreRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={styles.row}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${name} 仮眠スコア ${score}` : undefined}
    >
      {rank ? <RankBadge rank={rank} /> : null}
      <MemberAvatar
        label={name}
        status={status}
        avatarId={avatarId}
        avatarSeed={seed}
        showLabel={false}
      />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.scoreLabel}>仮眠スコア</Text>
      <Text style={styles.score}>{score}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scoreLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  score: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
