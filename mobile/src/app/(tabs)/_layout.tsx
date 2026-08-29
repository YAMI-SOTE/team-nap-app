import { Tabs } from "expo-router";

import { colors } from "@/theme/colors";
import {
  CalendarIcon,
  GearIcon,
  HouseIcon,
  MoonStarsIcon,
  UsersThreeIcon,
} from "@/components/icons";

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
        name="rest"
        options={{
          title: "仮眠",
          tabBarIcon: ({ color, size }) => (
            <MoonStarsIcon color={color} size={size} />
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
        name="settings"
        options={{
          title: "設定",
          tabBarIcon: ({ color, size }) => (
            <GearIcon color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
