import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import { avatarSource } from "@/constants/avatars";

type AvatarProps = {
  /** Stored avatar id (see constants/avatars). Null → initials fallback. */
  avatarId?: string | null;
  /** Display name — used for the initials fallback. */
  name?: string | null;
  /** Diameter in px. Default 40. */
  size?: number;
  /** Draw a brand-colored ring around the avatar. */
  ring?: boolean;
  style?: ViewStyle;
};

/** First character of the name, upper-cased. "?" when there is no name. */
function initial(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

/**
 * Circular user avatar. Renders the chosen pixel-art avatar when one is
 * set, otherwise a neutral circle with the name's initial.
 */
export default function Avatar({
  avatarId,
  name,
  size = 40,
  ring = false,
  style,
}: AvatarProps) {
  const source = avatarSource(avatarId);
  const frame: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 2 : 0,
    borderColor: colors.borderBrand,
  };

  return (
    <View style={[styles.frame, frame, style]}>
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {initial(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSunken,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initial: {
    fontWeight: "700",
    color: colors.textBrand,
  },
});
