import type { PropsWithChildren } from "react";
import { Image, StyleSheet, View } from "react-native";

/**
 * ログイン / アカウント作成の背景。
 *
 * Figma では S01-02_Login と S01-07_SignUp の Content が同じ画像塗り
 * （空と雲の淡いイラスト, image FILL, node 733:4277 / 733:4416）を持っていて、
 * 下側は白いカードで覆われるためスクリムは入っていない。
 *
 * SkyBackground（単色グラデの近似）を置き換える。
 */
export default function EntryBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/backgrounds/entry-form-day.png")}
        style={styles.image}
        resizeMode="cover"
        accessible={false}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
  },
});
