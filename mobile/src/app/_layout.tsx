import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { notifyFrontendBoot } from "@/services/appBoot";
import { AuthProvider } from "@/features/auth/AuthContext";
import { NotificationsProvider } from "@/features/notifications/NotificationsProvider";
import { RealtimeProvider } from "@/features/realtime/RealtimeProvider";

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
    <AuthProvider>
      <RealtimeProvider>
        <NotificationsProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </NotificationsProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
