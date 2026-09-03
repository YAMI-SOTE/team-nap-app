import type { PropsWithChildren } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

/**
 * Wraps a scrollable form.
 *
 * - **Native**: tap outside a field to dismiss the software keyboard,
 *   plus `KeyboardAvoidingView` so the focused field stays visible.
 * - **Web**: a plain flex `View`. There is no software keyboard to
 *   dismiss, and `TouchableWithoutFeedback` on web swallows the click
 *   that should focus a `TextInput` — with it in place the email /
 *   password fields are impossible to type into.
 */
export default function KeyboardDismiss({ children }: PropsWithChildren) {
  if (Platform.OS === "web") {
    return <View style={styles.flex}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {children}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
