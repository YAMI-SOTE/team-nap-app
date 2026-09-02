import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";
import { EyeIcon, EyeSlashIcon } from "@/components/icons";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry"> & {
  /** Whether the field starts revealed. Default: false (masked). */
  initiallyVisible?: boolean;
};

// Layout props go on the wrapper; everything else styles the field.
const WRAPPER_KEYS = [
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginVertical",
  "marginHorizontal",
  "alignSelf",
  "width",
  "flex",
] as const;

/**
 * A password field with a show / hide eye toggle sitting just inside the
 * right edge of the input box. Forwards every `TextInput` prop; the
 * caller's `style` (e.g. the screen's shared `input` style) is split so
 * margins land on the wrapper and the rest on the field.
 */
export default function PasswordInput({
  initiallyVisible = false,
  style,
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(initiallyVisible);

  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const wrapperStyle: ViewStyle = {};
  const fieldStyle: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if ((WRAPPER_KEYS as readonly string[]).includes(key)) {
      (wrapperStyle as Record<string, unknown>)[key] = value;
    } else {
      fieldStyle[key] = value;
    }
  }

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      <TextInput
        {...inputProps}
        style={[fieldStyle, styles.field]}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? "パスワードを隠す" : "パスワードを表示"}
      >
        {visible ? (
          <EyeSlashIcon size={20} color={colors.textTertiary} />
        ) : (
          <EyeIcon size={20} color={colors.textTertiary} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    justifyContent: "center",
  },
  field: {
    // room for the eye button; no bottom margin (that's on the wrapper).
    marginBottom: 0,
    marginTop: 0,
    marginVertical: 0,
    paddingRight: 44,
  },
  toggle: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
