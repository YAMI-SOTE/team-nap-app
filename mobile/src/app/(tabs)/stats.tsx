import TabSwipe from "@/components/TabSwipe";
import StatsScreen from "@/features/stats/StatsScreen";

export default function StatsRoute() {
  return (
    <TabSwipe current="/stats">
      <StatsScreen />
    </TabSwipe>
  );
}
