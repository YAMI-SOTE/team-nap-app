import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { ClipboardTextIcon, MoonStarsIcon } from "@/components/icons";
import type { MemberStatus } from "@/components/MemberAvatar";

type StatusChipProps = {
  status: MemberStatus;
  style?: ViewStyle;
};

const CONFIG: Record<
  MemberStatus,
  { label: string; background: string; foreground: string }
> = {
  resting: {
    label: "仮眠中",
    background: colors.brandSubtle,
    foreground: colors.textBrand,
  },
  working: {
    label: "作業中",
    background: colors.surfaceSunken,
    foreground: colors.textSecondary,
  },
  offline: {
    label: "オフライン",
    background: colors.surfaceSunken,
    foreground: colors.textTertiary,
  },
};

/**
 * Pill showing a member's current presence — icon + label — used in the
 * member profile header (Figma "StatusChip", node 269:639).
 */
export default function StatusChip({ status, style }: StatusChipProps) {
  const { label, background, foreground } = CONFIG[status];
  const Icon = status === "working" ? ClipboardTextIcon : MoonStarsIcon;

  return (
    <View style={[styles.chip, { backgroundColor: background }, style]}>
      <Icon size={18} color={foreground} />
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
  },
});
