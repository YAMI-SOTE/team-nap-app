import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import StatusChip from "@/components/StatusChip";
import type { MemberStatus } from "@/components/MemberAvatar";

type MemberProfileHeaderProps = {
  name: string;
  status: MemberStatus;
  /** Optional avatar photo. Falls back to a dashed placeholder circle. */
  imageUri?: string;
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
  imageUri,
}: MemberProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
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
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderBrand,
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
