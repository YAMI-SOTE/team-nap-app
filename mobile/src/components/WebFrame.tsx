import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";

/**
 * Makes the app usable in a desktop browser. The screens are designed for
 * a phone-width column, so on the web we centre that column against a
 * muted backdrop instead of stretching every layout across a wide
 * viewport. Below `MAX_WIDTH` it is simply full-bleed, so it stays
 * responsive on a phone browser too.
 *
 * No-op on native.
 */
const MAX_WIDTH = 440;

export default function WebFrame({ children }: PropsWithChildren) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceSunken,
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.background,
    // A soft edge so the column reads as a distinct surface on a wide
    // screen (invisible when the column already fills a narrow viewport).
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
});
