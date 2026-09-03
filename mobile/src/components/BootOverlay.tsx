import { StyleSheet, View } from "react-native";

import { colors } from "@/theme/colors";
import Logo from "@/components/Logo";

/**
 * Covers the screen while `AuthContext` is still restoring the session,
 * so a directly-opened protected URL never flashes its content before
 * `useProtectedRoute` can redirect.
 */
export default function BootOverlay() {
  return (
    <View style={styles.fill} pointerEvents="auto">
      <Logo width={140} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
