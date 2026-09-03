import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import { DotsThreeCircleIcon } from "@/components/icons";

export type MemberRowMember = {
  id: string;
  label: string;
  status: MemberStatus;
  /** Chosen avatar id, or null → a default icon seeded by `id`. */
  avatar?: string | null;
};

type MemberRowProps = {
  members: MemberRowMember[];
  onMemberPress?: (id: string) => void;
  /** Shows a trailing "…" affordance when provided. */
  onMorePress?: () => void;
};

/**
 * Space-between row of member avatars with an optional trailing "more"
 * control — the "メンバーのようす" pattern shared by the Home, Team, and
 * Team-settings screens (Figma "Members", node 305:1466).
 */
export default function MemberRow({
  members,
  onMemberPress,
  onMorePress,
}: MemberRowProps) {
  return (
    <View style={styles.row}>
      {members.map((member) => (
        <MemberAvatar
          key={member.id}
          label={member.label}
          status={member.status}
          avatarId={member.avatar}
          avatarSeed={member.id}
          onPress={
            onMemberPress ? () => onMemberPress(member.id) : undefined
          }
        />
      ))}
      {onMorePress ? (
        <Pressable
          onPress={onMorePress}
          accessibilityRole="button"
          accessibilityLabel="メンバーをもっと見る"
          style={styles.more}
          hitSlop={8}
        >
          <DotsThreeCircleIcon size={40} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  more: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
