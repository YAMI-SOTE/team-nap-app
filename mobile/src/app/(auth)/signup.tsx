import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/spacing";
import { useSignUp } from "@/hooks/useSignUp";
import type { LoginResult } from "@/services/authService";
import SkyBackground from "@/components/SkyBackground";

export default function SignUpScreen() {
  const router = useRouter();
  const {
    email,
    password,
    confirmPassword,
    isSubmitting,
    errorMessage,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
  } = useSignUp();

  const handleSubmit = async () => {
    const result: LoginResult | null = await submit();
    if (result) {
      router.replace("/home");
    }
  };

  return (
    <SkyBackground>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Image
                source={require("../../../assets/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.heading}>はじめまして</Text>
              <Text style={styles.subtitle}>
                アカウントを作成してください
              </Text>

              <View style={styles.formArea}>
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  testID="signup-email-input"
                />

                <Text style={styles.label}>パスワード</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8文字以上で入力"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isSubmitting}
                  testID="signup-password-input"
                />

                <Text style={styles.label}>パスワード（確認用）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="もう一度入力してください"
                  placeholderTextColor={colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isSubmitting}
                  testID="signup-confirm-password-input"
                />

                {errorMessage ? (
                  <Text style={styles.errorText} testID="signup-error-text">
                    {errorMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  testID="signup-submit-button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>登録する</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>
                    すでにアカウントをお持ちの方は{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login")}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.bottomLink}>ログイン</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  logo: {
    width: 110,
    height: 55,
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  formArea: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  bottomText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottomLink: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primary,
  },
});
