import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ReactNode } from "react";

import { colors } from "@/theme/colors";
import PillButton from "@/components/PillButton";

type EmptyStateProps = {
  image: ImageSourcePropType;
  title: string;
  body?: string;
  actionLabel?: string;
  /** CTA の先頭アイコン（Figma は MoonStars 24）。 */
  actionIcon?: ReactNode;
  onAction?: () => void;
};

/**
 * キャラクター＋コピー＋任意のCTAを中央に置く空状態
 * （Figma "EmptyState", node 733:5197）。
 * py24 / 要素間 14、見出しと本文だけ 6 で寄せる。
 */
export default function EmptyState({
  image,
  title,
  body,
  actionLabel,
  actionIcon,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Image source={image} style={styles.image} resizeMode="contain" />

      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>

      {actionLabel && onAction ? (
        <PillButton
          variant="primary"
          label={actionLabel}
          elevated={false}
          icon={actionIcon}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    // 左右の余白は画面側（Content px24）が持つ。
    paddingVertical: 24,
    gap: 14,
  },
  image: {
    width: 200,
    height: 200,
  },
  head: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  title: {
    // Figma: Heading/H4 — 18px / 1.5 / 700
    width: "100%",
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    // Figma: Caption/Regular — 12px / 1.6
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
  },
  action: {
    // Figma: py10 + 16px/1.7 の1行 = 47px
    minHeight: 47,
  },
});
