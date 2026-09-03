import TabSwipe from "@/components/TabSwipe";
import ScheduleScreen from "@/features/schedule/ScheduleScreen";

export default function ScheduleRoute() {
  return (
    <TabSwipe current="/schedule">
      <ScheduleScreen />
    </TabSwipe>
  );
}
