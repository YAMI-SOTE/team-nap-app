import { Platform, Switch } from "react-native";

import { colors } from "@/theme/colors";

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * App-styled switch (Figma "ToggleSwitch"): teal track when on, white
 * thumb. Thin wrapper around React Native's built-in `Switch`.
 */
export default function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.borderSubtle, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.borderSubtle}
      style={
        Platform.OS === "ios"
          ? { transform: [{ scaleX: 0.92 }, { scaleY: 0.92 }] }
          : undefined
      }
    />
  );
}
