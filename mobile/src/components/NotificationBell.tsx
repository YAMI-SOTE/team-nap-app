import type { ColorValue } from "react-native";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { BellIcon } from "@/components/icons";
import { useNotificationsContext } from "@/features/notifications/NotificationsProvider";

type NotificationBellProps = {
  /** Icon size in px. Default 24 (Home uses 26). */
  size?: number;
  /** Icon color. Defaults to the brand primary. */
  color?: ColorValue;
};

/**
 * Shared header bell. Routes to the notifications screen and shows the
 * red badge dot whenever the backend reports unread notifications, so
 * the indicator stays identical across every screen header.
 */
export default function NotificationBell({
  size = 24,
  color = colors.primary,
}: NotificationBellProps) {
  const router = useRouter();
  const { unreadCount } = useNotificationsContext();
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `通知（未読${unreadCount}件）` : "通知"}
      hitSlop={8}
      style={styles.button}
    >
      <BellIcon size={size} color={color} showDot={hasUnread} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});
