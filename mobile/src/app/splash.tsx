import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import Logo from "@/components/Logo";
import { useAuth } from "@/features/auth/AuthContext";

/** Minimum time the splash is shown, so it doesn't flash on a fast restore. */
const MIN_SPLASH_MS = 900;

export default function SplashScreen() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!minElapsed || status === "loading") return;

    if (status === "signedOut") {
      router.replace("/login");
      return;
    }
    router.replace(user?.onboardingCompleted ? "/home" : "/onboarding");
  }, [minElapsed, status, user, router]);

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
