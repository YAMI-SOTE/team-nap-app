import TabSwipe from "@/components/TabSwipe";
import SettingsScreen from "@/features/settings/SettingsScreen";

export default function SettingsRoute() {
  return (
    <TabSwipe current="/settings">
      <SettingsScreen />
    </TabSwipe>
  );
}
