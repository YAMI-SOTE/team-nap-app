import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
const BAR_CONTENT_HEIGHT = 58;
const IS_WEB = Platform.OS === "web";
const WEB_BAR_CONTENT_HEIGHT = 68;

export default function TabsLayout() {
  // Add the device's bottom inset ourselves (0 on web / most Android) so
  // react-navigation doesn't also add it and push the labels off-screen.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textBrand,
        tabBarInactiveTintColor: "#000000",
        tabBarShowLabel: true,
        // Web flips to "beside-icon" when the bar is "wide enough", which
        // then has no room for the 5 JP labels and drops them.
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 1,
          paddingBottom: IS_WEB ? 1 : 0,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarItemStyle: {
          paddingVertical: 0,
          minHeight: IS_WEB ? 48 : undefined,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderStrong,
          borderTopWidth: 1,
          height: (IS_WEB ? WEB_BAR_CONTENT_HEIGHT : BAR_CONTENT_HEIGHT) + insets.bottom,
          minHeight: (IS_WEB ? WEB_BAR_CONTENT_HEIGHT : BAR_CONTENT_HEIGHT) + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          paddingHorizontal: 4,
          overflow: "visible",
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
