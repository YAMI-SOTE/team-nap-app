import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme/colors";
import Logo from "@/components/Logo";

/**
 * Visual splash. Navigation away from here is handled centrally by
 * `useProtectedRoute` in the root layout once the session is known.
 */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Logo width={160} color={colors.white} />
      <Text style={styles.catchphrase}>休むことも、チームの仕事に</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 24,
  },
  catchphrase: {
    // Figma: Body/L-Bold — 16px / line-height 1.7 / weight 700
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.white,
    textAlign: "center",
  },
});
