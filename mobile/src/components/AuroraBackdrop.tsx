import { StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import Aura from "@/components/Aura";

/**
 * Soft brand-tinted aurora that sits behind a screen's content, spilling
 * in from the top and top-right edges (Figma "Aura", node 321:2146 — a
 * ~420px #E6F6F6 circle with a 24px blur bleeding past the frame edges).
 *
 * Rendered as a few overlapping radial glows so the top of the screen
 * reads as one continuous wash rather than separate discs. Absolutely
 * positioned + `overflow: hidden`, so it never affects layout or scroll.
 */
export default function AuroraBackdrop() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top — main wash, slightly left of centre */}
      <Aura
        size={400}
        top={-180}
        left={-80}
        color={colors.mintVeil}
        intensity={0.95}
      />
      {/* Top-right — corner accent */}
      <Aura
        size={320}
        top={-130}
        right={-110}
        color={colors.mintVeil}
        intensity={0.9}
      />
      {/* Bridge the two so the band feels continuous */}
      <Aura
        size={300}
        top={-70}
        left={120}
        color={colors.brandSubtle}
        intensity={0.6}
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
    overflow: "hidden",
  },
});
