import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

type Option<T extends string> = { key: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (key: T) => void;
};

/**
 * Pill segmented control (Figma "Tabs", node 271:764): a sunken track
 * with the active segment lifted on a white, shadowed pill.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.label, active ? styles.labelActive : styles.labelIdle]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.textBrand,
  },
  labelIdle: {
    color: colors.textTertiary,
  },
});
