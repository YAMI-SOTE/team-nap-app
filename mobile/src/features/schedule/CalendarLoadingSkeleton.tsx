import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { TimerIcon } from "@/components/icons";

/**
 * "カレンダーを読み込んでいます…" — pulsing placeholder cards while the
 * day schedule loads (Figma S07 / 309:1906).
 */
export default function CalendarLoadingSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
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
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <TimerIcon size={16} color={colors.textBrand} />
        <Text style={styles.heading}>カレンダーを読み込んでいます…</Text>
      </View>

      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.card, { opacity: pulse }]}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: "40%" }]} />
            <View style={[styles.line, { width: "72%" }]} />
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
