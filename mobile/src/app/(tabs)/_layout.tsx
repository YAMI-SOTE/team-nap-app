import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="rest"
        options={{
          title: "Rest",
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
        }}
      />

      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
