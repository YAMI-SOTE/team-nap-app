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

/**
 * Fire `onPush` whenever a push lands on this device: while the app is
 * foregrounded (`addNotificationReceivedListener`) and when the user opens
 * one from the background (`addNotificationResponseReceivedListener`).
 * A tap that cold-starts the app needs no listener — the provider already
 * re-fetches on mount.
 *
 * Returns an unsubscribe. Like the rest of this module it is best-effort —
 * on web there is no remote push, so it is a no-op and the AppState
 * refresh in `NotificationsProvider` remains the only trigger.
 */
export function addPushReceivedListener(onPush: () => void): () => void {
  if (Platform.OS === "web") return () => {};

  const received = Notifications.addNotificationReceivedListener(() => {
    onPush();
  });
  const opened = Notifications.addNotificationResponseReceivedListener(() => {
    onPush();
  });

  return () => {
    received.remove();
    opened.remove();
  };
}

// ---------------------------------------------------------------------------
// Nap-end alarm (local, scheduled on the device)
// ---------------------------------------------------------------------------

/**
 * Identifier for the one scheduled nap alarm, so starting a new nap
 * replaces the previous one rather than stacking alarms.
 */
const NAP_ALARM_ID = "nap-end-alarm";

/**
 * Ring when the nap is due to end.
 *
 * This is a *local* notification on purpose. A napping phone is locked
 * with the app in the background — the JS timer in the Rest screen is not
 * running, and a server push depends on connectivity, notification
 * permission and (on a simulator or web) infrastructure that does not
 * exist. A local scheduled alarm is the only mechanism that reliably
 * fires with the app closed, which is exactly the case that matters for
 * a wake-up. The server writes the matching feed entry separately and
 * suppresses its push so the same nap cannot alert twice.
 *
 * Best-effort like the rest of this module: no permission, no alarm.
 */
export async function scheduleNapEndAlarm(secondsFromNow: number): Promise<void> {
  if (Platform.OS === "web") return;
  if (secondsFromNow <= 0) return;

  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    await cancelNapEndAlarm();
    await Notifications.scheduleNotificationAsync({
      identifier: NAP_ALARM_ID,
      content: {
        title: "仮眠の時間が終わりました",
        body: "おつかれさま。ゆっくり起きて、ふりかえりを記録しましょう。",
        sound: "default",
        data: { kind: "nap_ended" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.ceil(secondsFromNow),
        repeats: false,
      },
    });
  } catch {
    /* best-effort — the in-app timer still ends the nap when foregrounded */
  }
}

/** Cancel a pending nap alarm (nap cancelled, ended early, or screen left). */
export async function cancelNapEndAlarm(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NAP_ALARM_ID);
  } catch {
    /* nothing scheduled */
  }
}
