import type { ReactNode } from "react";
import {
  ActivityIndicator,
  type Insets,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";

type PillButtonVariant = "primary" | "outline" | "onColor";

type PillButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: PillButtonVariant;
  /** Leading icon node, e.g. `<MoonStarsIcon color={...} size={...} />`. */
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  /** Drop shadow on the "primary" variant. Default true. */
  elevated?: boolean;
  /**
   * 44pt を下回る高さのボタンでタップ領域を補う。
   * （例: Home「みんなを誘う」はデザイン上 40pt なので上下 4pt 足す）
   */
  hitSlop?: number | Insets;
  /** アイコンとラベルの間隔。Figma のボタンごとに 8 か 10。 */
  gap?: number;
  testID?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/**
 * Pill-shaped action button.
 * - "primary": filled brand CTA (e.g. "仮眠を開始")
 * - "outline": white fill, brand border + text (e.g. "みんなに仮眠を提案")
 * - "onColor": white fill, no border, brand text — for use on a colored
 *   surface (e.g. the "15分仮眠を提案" button inside the teal card)
 */
export default function PillButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  elevated = true,
  hitSlop,
  gap = 8,
  testID,
  style,
  textStyle,
}: PillButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === "primary"
      ? styles.primary
      : variant === "onColor"
        ? styles.onColor
        : styles.outline;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={hitSlop}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        isPrimary && elevated && styles.elevated,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.white : colors.textBrand}
        />
      ) : (
        <View style={[styles.content, { gap }]}>
          {icon}
          <Text
            style={[
              styles.label,
              isPrimary ? styles.labelPrimary : styles.labelBrand,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
    minHeight: 58,
    paddingVertical: 10,
  },
  elevated: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderBrand,
    paddingVertical: 10,
  },
  onColor: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  labelPrimary: {
    color: colors.white,
  },
  labelBrand: {
    color: colors.textBrand,
  },
});
