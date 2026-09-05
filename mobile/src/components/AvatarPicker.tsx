import { Image, Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import { AVATARS, type AvatarId } from "@/constants/avatars";

type AvatarPickerProps = {
  /** Currently selected avatar id, or null when nothing is chosen yet. */
  selected: AvatarId | null;
  onSelect: (id: AvatarId) => void;
  /** Diameter of each option in px. Default 72. */
  size?: number;
  /**
   * Space between the options. Defaults to 72's companion, 16.
   *
   * Scales with `size` at the call site: the onboarding slide sizes every
   * other element off the viewport, so a fixed gap here would drift out of
   * proportion exactly as a fixed `size` does.
   */
  gap?: number;
  disabled?: boolean;
};

/**
 * Horizontal row of tappable circular avatars. The selected one gets a
 * brand ring. Used on the onboarding "アイコンを選ぼう" slide and in the
 * account screen.
 */
export default function AvatarPicker({
  selected,
  onSelect,
  size = 72,
  gap = 16,
  disabled = false,
}: AvatarPickerProps) {
  // The ring and its inset are part of the circle's footprint, so they
  // have to shrink with it or a small option is mostly border.
  const ring = Math.max(1, Math.round((size / 72) * 2));

  return (
    <View style={[styles.row, { gap }]}>
      {AVATARS.map((avatar) => {
        const isSelected = avatar.id === selected;
        return (
          <Pressable
            key={avatar.id}
            onPress={() => onSelect(avatar.id)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={avatar.label}
            style={[
              styles.option,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: ring,
                padding: ring,
              },
              isSelected && styles.optionSelected,
            ]}
          >
            <Image
              source={avatar.source}
              style={[
                styles.image,
                { borderRadius: (size - ring * 4) / 2 },
              ]}
              resizeMode="cover"
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "transparent",
  },
  optionSelected: {
    borderColor: colors.borderBrand,
  },
  image: {
    flex: 1,
    aspectRatio: 1,
    width: "100%",
  },
});
