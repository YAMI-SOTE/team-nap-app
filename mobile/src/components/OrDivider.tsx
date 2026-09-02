import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

/**
 * 「または」の区切り（Figma "Or", node 733:4288）。
 * 罫線 1px と 12px のキャプションを 12px 間隔で並べるだけで、
 * 上下の余白は親のスタックギャップに任せる。
 */
export default function OrDivider() {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>または</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderDefault,
  },
  text: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
});
