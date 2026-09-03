import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * 汎用画面の背景。
 *
 * Figma では設定・統計・スケジュール・チーム設定などの画面が、Content の塗りに
 * 「淡い湖畔のイラスト（image, FILL）＋ 白のリニアグラデ（0% 透明 → 60% で不透明）」
 * の2枚重ねを持っている（node 733:5260 / 733:4596 / 733:5102 ほか）。
 * つまり“無地に見える”画面も実際は背景画像で、上端だけ空と山がうっすら覗く。
 *
 * AuroraBackdrop（放射グラデの近似）を置き換える。使い方は同じで、画面の
 * ルート View の最初の子として置くだけ。絶対配置なのでレイアウトに影響しない。
 */
export default function AppBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require("../../assets/backgrounds/app-day.png")}
        style={styles.image}
        resizeMode="cover"
        accessible={false}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0)", "#FFFFFF"]}
        locations={[0, 0.6]}
        style={styles.scrim}
      />
    </View>
  );
}

const fill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const styles = StyleSheet.create({
  container: {
    ...fill,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  image: {
    ...fill,
    width: "100%",
    height: "100%",
  },
  scrim: fill,
});
