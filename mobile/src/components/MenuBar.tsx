import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import {
  CalendarIcon,
  ChartBarIcon,
  GearIcon,
  HouseIcon,
  UsersThreeIcon,
} from "@/components/icons";

type MenuBarTab = "home" | "schedule" | "team" | "stats" | "settings";

type MenuBarProps = {
  activeTab?: MenuBarTab;
};

const TABS: Array<{
  key: MenuBarTab;
  label: string;
  href: string;
  renderIcon: (color: string) => ReactNode;
}> = [
  {
    key: "home",
    label: "ホーム",
    href: "/home",
    renderIcon: (color) => <HouseIcon color={color} size={24} />,
  },
  {
    key: "schedule",
    label: "スケジュール",
    href: "/schedule",
    renderIcon: (color) => <CalendarIcon color={color} size={24} />,
  },
  {
    key: "team",
    label: "チーム",
    href: "/team",
    renderIcon: (color) => <UsersThreeIcon color={color} size={24} />,
  },
  {
    key: "stats",
    label: "統計",
    href: "/stats",
    renderIcon: (color) => <ChartBarIcon color={color} size={24} />,
  },
  {
    key: "settings",
    label: "設定",
    href: "/settings",
    renderIcon: (color) => <GearIcon color={color} size={24} />,
  },
];

const IS_WEB = Platform.OS === "web";
const WEB_BAR_MIN_HEIGHT = 68;
const NATIVE_BAR_MIN_HEIGHT = 58;

export default function MenuBar({ activeTab }: MenuBarProps) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const color = isActive ? colors.textBrand : "#000000";

        return (
          <Pressable
            key={tab.key}
            onPress={() => router.replace(tab.href)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            {tab.renderIcon(color)}
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderTopColor: colors.borderStrong,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: IS_WEB ? WEB_BAR_MIN_HEIGHT : NATIVE_BAR_MIN_HEIGHT,
    overflow: "visible",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: IS_WEB ? 48 : undefined,
    paddingBottom: IS_WEB ? 2 : 0,
  },
  itemPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    paddingBottom: IS_WEB ? 1 : 0,
  },
});
