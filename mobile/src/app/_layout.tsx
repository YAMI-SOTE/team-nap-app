import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { notifyFrontendBoot } from "@/services/appBoot";

export default function RootLayout() {
  useEffect(() => {
    async function sendBootSignal() {
      try {
        const result = await notifyFrontendBoot({
          platform: Platform.OS,
          bootedAt: new Date().toISOString(),
        });

        console.log(`[frontend] ${result.message}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown boot error";
        console.log(`[frontend] boot notification failed: ${message}`);
      }
    }

    sendBootSignal();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
