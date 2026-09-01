import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/theme/colors";

/**
 * Serene sky-and-hills scene used behind the ふりかえり screen
 * (Figma S02-04_Nap_Advice, node 268:614): a full-bleed landscape image
 * with a vertical white wash that fades the lower ~40% to solid white so
 * foreground text stays legible. Absolutely positioned, never affects
 * layout, `pointerEvents="none"`.
 */
export default function SkyBackdrop() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require("../../assets/backgrounds/reflection-sky.png")}
        style={styles.image}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0)", colors.white]}
        locations={[0, 0.42, 0.62]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    width: "100%",
  },
});
