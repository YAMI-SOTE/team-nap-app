import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";

export type MemberStatus = "working" | "resting" | "offline";

type MemberAvatarProps = {
  /** Short label shown under the avatar (e.g. a name initial). */
  label: string;
  /** Presence state — drives the status dot color. */
  status: MemberStatus;
  /** Optional avatar photo. Falls back to a neutral circle. */
  imageUri?: string;
  /** Render the label under the avatar. Default `true`. */
  showLabel?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const AVATAR_SIZE = 40;
const DOT_SIZE = 16;

const STATUS_COLOR: Record<MemberStatus, string> = {
  working: colors.statusWorking,
  resting: colors.primary,
  offline: colors.statusOffline,
};

/**
 * Member presence chip used in the Home screen "メンバーのようす" row
 * (Figma "member" 138:625 + "login status").
 */
export default function MemberAvatar({
  label,
  status,
  imageUri,
  showLabel = true,
  onPress,
  style,
}: MemberAvatarProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? label : undefined}
    >
      <View style={styles.avatarWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]} />
        )}
        <View
          style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]}
        />
      </View>
      {showLabel ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
    width: 42,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    backgroundColor: "#D9D9D9",
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.white,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
