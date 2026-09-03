import TabSwipe from "@/components/TabSwipe";
import TeamScreen from "@/features/team/TeamScreen";

export default function TeamRoute() {
  return (
    <TabSwipe current="/team">
      <TeamScreen />
    </TabSwipe>
  );
}
