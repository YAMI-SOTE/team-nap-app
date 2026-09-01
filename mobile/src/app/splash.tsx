import { useEffect, useState } from "react";
import { Image, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
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
      <SafeAreaView style={styles.content}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.catchphrase}>休むことも、チームの仕事に</Text>
        <ActivityIndicator
          size="large"
          color={colors.white}
          style={styles.spinner}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: spacing.lg,
  },
  catchphrase: {
    fontSize: 18,
    color: colors.white,
    fontWeight: "600",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  spinner: {
    marginTop: spacing.xxl,
  },
});
