import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";

type LabeledInputProps = TextInputProps & {
  label: string;
  containerStyle?: ViewStyle;
};

/**
 * Bold label above a bordered text input (Figma "InputField", node
 * 155:2121). Forwards all standard `TextInput` props.
 */
export default function LabeledInput({
  label,
  containerStyle,
  style,
  ...inputProps
}: LabeledInputProps) {
  const multiline = inputProps.multiline ?? false;

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
        />
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
  inputMultiline: {
    textAlignVertical: "top",
    paddingTop: 4,
  },
});
