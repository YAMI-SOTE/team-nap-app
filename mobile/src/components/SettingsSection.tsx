import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

/**
 * A titled group of settings rows (Figma "Component 2" heading variant,
 * node 237:343).
 */
export default function SettingsSection({
  title,
  children,
}: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    // 見出しと1行目の間隔（Figma node 733:5251 の gap-16）。
    gap: 16,
  },
  heading: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rows: {
    width: "100%",
    gap: 8,
  },
});
