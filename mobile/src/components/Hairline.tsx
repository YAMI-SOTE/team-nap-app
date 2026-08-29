import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";

/**
 * 1px full-width divider. Used to separate the stacked sections on the
 * Home screen (Figma "Hairline", --tn-border-subtle).
 */
export default function Hairline({ style }: { style?: ViewStyle }) {
  return <View style={[styles.line, style]} />;
}

const styles = StyleSheet.create({
  line: {
    width: "100%",
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
});
