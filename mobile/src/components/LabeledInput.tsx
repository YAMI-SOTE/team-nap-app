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
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.placeholder}
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
    borderWidth: 1,
    borderColor: "#CCCCCC", // Figma InputField border
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textPrimary,
  },
});
