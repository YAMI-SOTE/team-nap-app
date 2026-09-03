import TabSwipe from "@/components/TabSwipe";
import HomeScreen from "@/features/home/HomeScreen";

export default function HomeRoute() {
  return (
    <TabSwipe current="/home">
      <HomeScreen />
    </TabSwipe>
  );
}
