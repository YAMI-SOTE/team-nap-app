import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import Card from "@/components/Card";

type NotificationCardProps = {
  /** Renders the badge glyph in the given color. */
  renderIcon: (color: string) => ReactNode;
  title: string;
  body: string;
  timestamp: string;
  unread?: boolean;
  onPress?: () => void;
};

/**
 * A single row in the notification list (Figma "S07-01" cards): a round
 * icon badge, a title with an optional unread dot, a body line and a
 * relative timestamp. Unread items use the brand badge + bold title.
 */
export default function NotificationCard({
  renderIcon,
  title,
  body,
  timestamp,
  unread = false,
  onPress,
}: NotificationCardProps) {
  const badgeColor = unread ? colors.primary : colors.surfaceSunken;
  const iconColor = unread ? colors.white : colors.textTertiary;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${title}. ${body}`}
        style={styles.row}
      >
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          {renderIcon(iconColor)}
        </View>

        <View style={styles.text}>
          <View style={styles.head}>
            <Text
              style={[styles.title, unread ? styles.titleUnread : styles.titleRead]}
            >
              {title}
            </Text>
            {unread ? <View style={styles.dot} /> : null}
          </View>
          <Text style={styles.body}>{body}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 3,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  titleUnread: {
    fontWeight: "700",
  },
  titleRead: {
    fontWeight: "500",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  timestamp: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
});
