import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";

type LabeledInputProps = TextInputProps & {
  label: string;
  containerStyle?: ViewStyle;
  /**
   * パスワード欄で目のアイコンによる表示/非表示切替を出す。
   * `secureTextEntry` はこちらで管理するので指定不要。
   */
  revealToggle?: boolean;
};

/**
 * Bold label above a bordered text input (Figma "InputField", node
 * 155:2121). Forwards all standard `TextInput` props.
 */
export default function LabeledInput({
  label,
  containerStyle,
  style,
  revealToggle = false,
  ...inputProps
}: LabeledInputProps) {
  const multiline = inputProps.multiline ?? false;
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, multiline && styles.fieldMultiline]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.placeholder}
          // Keep a single line from pushing the caret/text out of the box.
          numberOfLines={multiline ? undefined : 1}
          {...inputProps}
          {...(revealToggle
            ? {
                secureTextEntry: !visible,
                autoCapitalize: "none" as const,
                autoCorrect: false,
              }
            : null)}
        />
        {revealToggle ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={
              visible ? "パスワードを隠す" : "パスワードを表示"
            }
          >
            {visible ? (
              <EyeSlashIcon size={20} color={colors.textTertiary} />
            ) : (
              <EyeIcon size={20} color={colors.textTertiary} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  label: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  field: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#CCCCCC", // Figma InputField border
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: "hidden",
  },
  fieldMultiline: {
    alignItems: "flex-start",
    minHeight: 96,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 15,
    color: colors.textPrimary,
    // Vertically centre the glyphs in the box on every platform:
    // no explicit lineHeight (breaks iOS centring), and drop Android's
    // extra font padding / force centre alignment.
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  toggle: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  inputMultiline: {
    textAlignVertical: "top",
    paddingTop: 4,
  },
});
