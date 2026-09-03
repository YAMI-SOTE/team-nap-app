import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "@/services/api";

/**
 * Expo push registration. Called from `AuthContext` once the user is
 * signed in; the token is sent to `POST /notifications/token` and the
 * backend pushes every `addNotification` to it.
 *
 * Everything here is best-effort — a simulator (no `Device.isDevice`),
 * a denied OS permission, or a project without an EAS id all just skip
 * registration. The in-app feed still works.
 */

// Show a banner even when a push arrives with the app foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

function easProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return; // no push on simulators / web

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = easProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    if (token && token !== registeredToken) {
      await api.post("/notifications/token", {
        token,
        platform: Platform.OS,
      });
      registeredToken = token;
    }
  } catch (err) {
    // No EAS project id, permission race, offline — push just stays off.
    console.warn("push registration skipped:", err);
  }
}

/** Drop this device's token on sign-out. Call while still authenticated. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  try {
    await api.del("/notifications/token", { token });
  } catch {
    /* best-effort — the backend also prunes dead tokens on send */
  }
}
