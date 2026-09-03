import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

type StatusPillProps = {
  label: string;
  /** 先頭アイコン。16px 想定（例: `<UsersThreeIcon size={16} />`）。 */
  icon?: ReactNode;
  style?: ViewStyle;
};

/**
 * イラスト背景の上に置く半透明ピル
 * （Figma「Status Chip / 2人がひとやすみ中」 node 802:3664）。
 *
 * 白 92% の地に淡い影を落とすことで、写真背景の上でも文字が沈まない。
 * メンバーの在席状態を表す `StatusChip` とは用途が異なるので別物として扱う。
 */
export default function StatusPill({ label, icon, style }: StatusPillProps) {
  return (
    <View style={[styles.pill, style]}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
