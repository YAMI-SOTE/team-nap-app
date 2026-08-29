import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

export default function SkyBackground({
  children,
}: PropsWithChildren) {
  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.midGlow} />
      <View style={styles.bottomFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  topGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#DDF3FA",
    opacity: 0.95,
  },
  midGlow: {
    position: "absolute",
    top: "28%",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#EEF8FC",
  },
  bottomFill: {
    position: "absolute",
    top: "62%",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
