import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { ArrowClockwiseIcon } from "@/components/icons";

/**
 * "カレンダーを読み込んでいます…" — a spinning refresh glyph over pulsing
 * placeholder cards while the day schedule (re)loads (Figma
 * S03-04_Schedule_Loading / 309:1906). Shown on first load and on every
 * pull-to-refresh / post-create / post-delete revalidation.
 */
export default function CalendarLoadingSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ArrowClockwiseIcon size={16} color={colors.textBrand} />
        </Animated.View>
        <Text style={styles.heading}>カレンダーを読み込んでいます…</Text>
      </View>

      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[styles.card, i === 0 && styles.cardLarge, { opacity: pulse }]}
        >
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: "40%" }]} />
            <View style={[styles.line, { width: "72%" }]} />
            {i === 0 ? <View style={[styles.line, { width: "56%" }]} /> : null}
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 12,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textBrand,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardLarge: {
    paddingVertical: 22,
    alignItems: "flex-start",
  },
  avatar: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceSunken,
  },
});
