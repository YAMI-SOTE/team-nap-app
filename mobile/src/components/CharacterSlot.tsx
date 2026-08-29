import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";

type CharacterSlotProps = {
  /** Width & height in px. */
  size?: number;
  /**
   * Character illustration. While empty, the slot shows a dashed brand
   * outline (matches the Figma component: remove the dashed stroke once
   * the artwork is supplied).
   */
  source?: ImageSourcePropType;
  style?: ViewStyle;
};

/**
 * Placeholder frame for the team character illustration
 * (Figma "CharacterSlot", node 258:746).
 */
export default function CharacterSlot({
  size = 84,
  source,
  style,
}: CharacterSlotProps) {
  return (
    <View
      style={[
        styles.slot,
        { width: size, height: size },
        source ? styles.filled : styles.empty,
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          resizeMode="contain"
          style={styles.image}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderBrand,
  },
  filled: {
    borderWidth: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
