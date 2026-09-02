import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * コマ送りアニメーション。
 *
 * Figma のキャラクターは 5 コマのループ（「Cat / Idle」 node 659:3765、
 * 「Nap / Cat / Sleeping」 node 813:1763）として作られていて、State
 * プロパティでコマを切り替える設計になっている。ここではその 5 枚を
 * 全部マウントしたまま opacity だけ入れ替えることで、デコード待ちの
 * ちらつきなしにループさせる。
 *
 * - 画面がフォーカスを失っている間はタイマーを止める（電池対策）。
 * - OS の「視差効果を減らす」がオンなら 1 コマ目で静止する。
 */

type SpriteLoopProps = {
  /** コマの並び。1コマ目が静止時の絵になる。 */
  frames: ImageSourcePropType[];
  /** 一辺の px。コマは正方形前提。 */
  size: number;
  /** 1コマあたりの表示時間(ms)。 */
  frameDurationMs?: number;
  /** false でループを止める。 */
  playing?: boolean;
  style?: ViewStyle;
};

export default function SpriteLoop({
  frames,
  size,
  frameDurationMs = 200,
  playing = true,
  style,
}: SpriteLoopProps) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focused, setFocused] = useState(true);
  const frameCount = frames.length;

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const running = playing && focused && !reduceMotion && frameCount > 1;
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (!running) {
      // 止めるときは1コマ目に戻し、再開位置を揃える。
      setIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % frameCount);
    }, frameDurationMs);

    return () => clearInterval(timer);
  }, [running, frameCount, frameDurationMs]);

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      {frames.map((frame, i) => (
        <Image
          key={i}
          source={frame}
          style={[
            styles.frame,
            { width: size, height: size, opacity: i === index ? 1 : 0 },
          ]}
          resizeMode="contain"
          accessible={false}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
