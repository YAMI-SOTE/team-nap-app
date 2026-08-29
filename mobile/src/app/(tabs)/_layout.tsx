import { Tabs } from "expo-router";

import { colors } from "@/theme/colors";
import {
  CalendarIcon,
  ChartBarIcon,
  GearIcon,
  HouseIcon,
  UsersThreeIcon,
} from "@/components/icons";

/**
 * Bottom tab bar — mirrors the Figma "MenuBar" (node 321:2210):
 * ホーム · スケジュール · チーム · 統計 · 設定, in that order.
 *
 * `rest` (仮眠) is intentionally NOT a tab in the design — it is reached
 * from the "仮眠を開始" button on Home — so it stays routable but hidden
 * from the bar via `href: null`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textBrand,
        tabBarInactiveTintColor: "#000000",
        tabBarLabelStyle: { fontSize: 10 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderStrong,
          borderTopWidth: 1,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size }) => (
            <HouseIcon color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: "スケジュール",
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="team"
        options={{
          title: "チーム",
          tabBarIcon: ({ color, size }) => (
            <UsersThreeIcon color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: "統計",
          tabBarIcon: ({ color, size }) => (
            <ChartBarIcon color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color, size }) => (
            <GearIcon color={color} size={size} />
          ),
        }}
      />

      {/* Not in the Figma tab bar — reachable via the Home "仮眠を開始" button. */}
      <Tabs.Screen name="rest" options={{ href: null }} />
    </Tabs>
  );
}
