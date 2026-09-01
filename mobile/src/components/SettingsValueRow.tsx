import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { CaretRightIcon } from "@/components/icons";

type SettingsValueRowProps = {
  /** Icon node shown inside the round badge. */
  icon: ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
};

/**
 * A settings row that shows an editable value — round icon badge, label,
 * bold value, and a chevron (Figma "就寝時間" / "起床時間", node 303:1393).
 */
export default function SettingsValueRow({
  icon,
  label,
  value,
  onPress,
}: SettingsValueRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `${label} ${value}` : undefined}
      style={styles.row}
    >
      <View style={styles.badge}>{icon}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value}>{value}</Text>
      <CaretRightIcon size={18} />
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    width: "100%",
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  value: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
