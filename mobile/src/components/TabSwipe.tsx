import { useMemo, type ReactNode } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * Horizontal swipe → move to the neighbouring bottom tab.
 *
 * Wraps a tab screen. A decisively horizontal drag (so it never steals a
 * vertical scroll or a tap) navigates to the previous / next tab in the
 * bar order. Uses the built-in `PanResponder` — no extra native deps.
 */

const TAB_ORDER = [
  "/home",
  "/schedule",
  "/team",
  "/stats",
  "/settings",
] as const;

export type TabPath = (typeof TAB_ORDER)[number];

/** Min horizontal travel (px) before a release counts as a tab change. */
const SWIPE_THRESHOLD = 60;

type TabSwipeProps = {
  current: TabPath;
  children: ReactNode;
};

export default function TabSwipe({ current, children }: TabSwipeProps) {
  const router = useRouter();

  const panHandlers = useMemo(() => {
    const index = TAB_ORDER.indexOf(current);
    return PanResponder.create({
      // Claim the gesture only once it's clearly horizontal, so children
      // (vertical ScrollViews, buttons) keep theirs.
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
      onPanResponderRelease: (_evt, g) => {
        if (g.dx <= -SWIPE_THRESHOLD && index < TAB_ORDER.length - 1) {
          router.navigate(TAB_ORDER[index + 1]);
        } else if (g.dx >= SWIPE_THRESHOLD && index > 0) {
          router.navigate(TAB_ORDER[index - 1]);
        }
      },
    }).panHandlers;
  }, [current, router]);

  return (
    <View style={styles.root} collapsable={false} {...panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
