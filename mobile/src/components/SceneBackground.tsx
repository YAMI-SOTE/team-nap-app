import type { PropsWithChildren } from "react";
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Full-bleed illustration背景 + 可読性スクリム。
 *
 * Figma「Background / Home / Day」系（node 659:3754）を敷く画面の共通土台。
 * スクリムは画面によって形が違うので `scrim` で切り替える。
 *
 * - "top"    … ホーム（S02-01）。上端 460px を白 0.92 →(55%) 0.72 → 0 で抜き、
 *              見出し・スコア・チップを読ませつつ下半分はイラストを見せる。
 * - "bottom" … 仮眠フロー（S02-02〜04 の「Background Scrim」node 806:3672）。
 *              上は透明のまま 60% 地点で白になり、カード類を白地に載せる。
 * - "none"   … スクリムなし。
 */

const TOP_SCRIM_HEIGHT = 460;

type ScrimVariant = "top" | "bottom" | "none";

type SceneBackgroundProps = PropsWithChildren<{
  source: ImageSourcePropType;
  scrim?: ScrimVariant;
  /** "top" スクリムの高さ(px)。デフォルトは Figma と同じ 460。 */
  scrimHeight?: number;
  /**
   * イラストの不透明度。Figma の Background インスタンスに入っている値を渡す。
   * ホーム(S02-01)は 0.8、チーム(S04-01c)と仮眠フローは 1。
   */
  imageOpacity?: number;
}>;

export default function SceneBackground({
  source,
  scrim = "top",
  scrimHeight = TOP_SCRIM_HEIGHT,
  imageOpacity = 0.8,
  children,
}: SceneBackgroundProps) {
  return (
    <View style={styles.root}>
      <Image
        source={source}
        style={[styles.image, { opacity: imageOpacity }]}
        resizeMode="cover"
        accessible={false}
      />

      {scrim === "top" ? (
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.92)",
            "rgba(255,255,255,0.72)",
            "rgba(255,255,255,0)",
          ]}
          locations={[0, 0.55, 1]}
          style={[styles.topScrim, { height: scrimHeight }]}
          pointerEvents="none"
        />
      ) : null}

      {scrim === "bottom" ? (
        <LinearGradient
          colors={["rgba(255,255,255,0)", "#FFFFFF", "#FFFFFF"]}
          locations={[0, 0.45, 1]}
          style={styles.fullScrim}
          pointerEvents="none"
        />
      ) : null}

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
  topScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  fullScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
});
