import { Image, Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import { AVATARS, type AvatarId } from "@/constants/avatars";

type AvatarPickerProps = {
  /** Currently selected avatar id, or null when nothing is chosen yet. */
  selected: AvatarId | null;
  onSelect: (id: AvatarId) => void;
  /** Diameter of each option in px. Default 72. */
  size?: number;
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
  disabled = false,
}: AvatarPickerProps) {
  return (
    <View style={styles.row}>
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
              },
              isSelected && styles.optionSelected,
            ]}
          >
            <Image
              source={avatar.source}
              style={[
                styles.image,
                { borderRadius: (size - 8) / 2 },
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
    gap: 16,
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
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
