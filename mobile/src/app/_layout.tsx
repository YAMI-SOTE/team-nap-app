import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

import { notifyFrontendBoot } from "@/services/appBoot";
import { AuthProvider } from "@/features/auth/AuthContext";
import { NotificationsProvider } from "@/features/notifications/NotificationsProvider";
import { RealtimeProvider } from "@/features/realtime/RealtimeProvider";
import WebFrame from "@/components/WebFrame";
// Side-effect: injects global CSS on web (focus-ring reset etc.).
import "@/styles/webGlobalStyles";

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
          {/* Centres the phone-width column in a desktop browser; no-op on native. */}
          <WebFrame>
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            >
              {/*
                Inside the tab area the iOS edge-swipe must not pop the root
                Stack back to the auth screens underneath — horizontal swipes
                here switch tabs instead (see components/TabSwipe).
              */}
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
            </Stack>
          </WebFrame>
        </NotificationsProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
