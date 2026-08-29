import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CaretRightIcon } from "@/components/icons";

type TaskCardProps = {
  /** Leading circular badge icon (e.g. `<AlarmBadgeIcon />`). */
  icon: ReactNode;
  /** Time range, e.g. "10:00〜11:00". */
  time: string;
  subtitle: string;
  onPress?: () => void;
  /** Show a trailing chevron. */
  showCaret?: boolean;
  /** Optional content rendered below the row (e.g. an action button). */
  footer?: ReactNode;
};

/**
 * Bordered schedule card — a circular badge, a time + subtitle, and an
 * optional chevron or footer (Figma "Task" / "Task / 次の空き時間",
 * nodes 242:338 / 242:356).
 */
export default function TaskCard({
  icon,
  time,
  subtitle,
  onPress,
  showCaret = false,
  footer,
}: TaskCardProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${time} ${subtitle}` : undefined}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {icon}
          <View style={styles.text}>
            <Text style={styles.time}>{time}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        {showCaret ? <CaretRightIcon size={24} color={colors.textTertiary} /> : null}
      </View>
      {footer}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  time: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textPrimary,
  },
});
