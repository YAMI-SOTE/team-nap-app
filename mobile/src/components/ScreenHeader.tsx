import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { CaretLeftIcon } from "@/components/icons";

type ScreenHeaderProps = {
  title: string;
  /** When provided, shows a back caret on the left. */
  onBack?: () => void;
};

const SIDE = 24;

/**
 * In-content navigation bar for pushed detail screens: a back caret, a
 * centered title, and a spacer that keeps the title optically centered
 * (Figma "NavigationBar", node 114:1128).
 */
export default function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          hitSlop={10}
          style={styles.side}
        >
          <CaretLeftIcon size={SIDE} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  side: {
    width: SIDE,
    height: SIDE,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
