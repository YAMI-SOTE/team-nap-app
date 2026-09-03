import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import Avatar from "@/components/Avatar";
import { defaultAvatarFor } from "@/utils/defaultAvatar";
import StatusChip from "@/components/StatusChip";
import type { MemberStatus } from "@/components/MemberAvatar";

type MemberProfileHeaderProps = {
  name: string;
  status: MemberStatus;
  /** The member's chosen avatar id, or null → default icon seeded by `seed`. */
  avatarId?: string | null;
  /** Seed for the default icon when `avatarId` is null (usually the member id). */
  seed?: string;
};

const AVATAR_SIZE = 104;
const DOT_SIZE = 26;

const DOT_COLOR: Record<MemberStatus, string> = {
  resting: colors.primary,
  working: colors.statusWorking,
  offline: colors.statusOffline,
};

/**
 * Centered member identity block: avatar + presence dot, name, and a
 * status chip. Shared by every member-detail state
 * (Figma "Profile", node 269:634).
 */
export default function MemberProfileHeader({
  name,
  status,
  avatarId,
  seed,
}: MemberProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        <Avatar
          avatarId={avatarId ?? defaultAvatarFor(seed ?? name)}
          name={name}
          size={AVATAR_SIZE}
        />
        <View
          style={[styles.dot, { backgroundColor: DOT_COLOR[status] }]}
        />
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      <StatusChip status={status} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 4,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  dot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.white,
  },
  name: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
