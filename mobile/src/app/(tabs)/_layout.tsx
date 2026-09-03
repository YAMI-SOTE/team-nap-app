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
 * `rest`（仮眠タイマー）は Figma 上もタブには含まれておらず、Homeの
 * 「仮眠を開始」ボタンから `app/rest.tsx`（このTabsグループの外）へ
 * 遷移する、タブバー非表示のフルスクリーン画面として実装している。
 * そのため、このグループ内には rest 用の screen 登録を置かない。
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textBrand,
        tabBarInactiveTintColor: "#000000",
        tabBarShowLabel: true,
        // Web defaults to "beside-icon" once the bar is "wide enough",
        // which then has no room for the 5 JP labels and drops them.
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderStrong,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        sceneStyle: { backgroundColor: colors.background },
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
    </Tabs>
  );
}
