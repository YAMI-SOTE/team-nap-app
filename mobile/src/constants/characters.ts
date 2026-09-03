import type { ImageSourcePropType } from "react-native";

/**
 * キャラクターのコマ送り素材。
 *
 * Figma の 5 コマ構成をそのまま順番に並べている
 * （「Cat / Idle」 node 659:3765 / 「Nap / Cat / Sleeping」 node 813:1763）。
 *
 * NOTE: Figma 側にコマ速度の指定（keyframe / motion）が無いため、
 * 下の duration はコード側で決めた暫定値。デザイン側で決まったら
 * ここだけ直せば全画面に反映される。
 */

export const CAT_IDLE_FRAMES: ImageSourcePropType[] = [
  require("../../assets/characters/cat-idle/1.png"),
  require("../../assets/characters/cat-idle/2.png"),
  require("../../assets/characters/cat-idle/3.png"),
  require("../../assets/characters/cat-idle/4.png"),
  require("../../assets/characters/cat-idle/5.png"),
];

export const CAT_SLEEPING_FRAMES: ImageSourcePropType[] = [
  require("../../assets/characters/cat-sleeping/1.png"),
  require("../../assets/characters/cat-sleeping/2.png"),
  require("../../assets/characters/cat-sleeping/3.png"),
  require("../../assets/characters/cat-sleeping/4.png"),
  require("../../assets/characters/cat-sleeping/5.png"),
];

/** ホームの猫。ゆるやかな待機モーション（5コマ×200ms = 1.0秒ループ）。 */
export const CAT_IDLE_FRAME_MS = 200;

/** 仮眠タイマーの猫。寝息に合わせて遅め（5コマ×300ms = 1.5秒ループ）。 */
export const CAT_SLEEPING_FRAME_MS = 300;
