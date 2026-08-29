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
import { useLogin } from "@/hooks/useLogin";
import SkyBackground from "@/components/SkyBackground";
import OrDivider from "@/components/OrDivider";

export default function LoginScreen() {
  const router = useRouter();
  const {
    email,
    password,
    isSubmitting,
    isGoogleSubmitting,
    errorMessage,
    setEmail,
    setPassword,
    submit,
    submitWithGoogle,
  } = useLogin();

  const isBusy = isSubmitting || isGoogleSubmitting;

  const handleSubmit = async () => {
    const result = await submit();
    if (result) {
      router.replace("/home");
    }
  };

  const handleGoogleSubmit = async () => {
    const result = await submitWithGoogle();
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

              <Text style={styles.heading}>おかえりなさい</Text>
              <Text style={styles.subtitle}>
                メールアドレスでログインしてください
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
                  editable={!isBusy}
                  testID="login-email-input"
                />

                <Text style={styles.label}>パスワード</Text>
                <TextInput
                  style={styles.input}
                  placeholder="パスワードを入力"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isBusy}
                  testID="login-password-input"
                />

                <TouchableOpacity style={styles.forgotLink} disabled={isBusy}>
                  <Text style={styles.forgotLinkText}>
                    パスワードをお忘れですか？
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={isBusy}
                  testID="login-submit-button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>ログイン</Text>
                  )}
                </TouchableOpacity>

                <OrDivider />

                <TouchableOpacity
                  style={[styles.googleButton, isBusy && styles.buttonDisabled]}
                  onPress={handleGoogleSubmit}
                  activeOpacity={0.85}
                  disabled={isBusy}
                  testID="login-google-button"
                >
                  {isGoogleSubmitting ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <>
                      <Image
                        source={require("../../../assets/google-icon.png")}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.googleButtonText}>
                        Googleでログイン
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {errorMessage ? (
                  <Text style={styles.errorText} testID="login-error-text">
                    {errorMessage}
                  </Text>
                ) : null}

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>
                    アカウントをお持ちでない方は{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/signup")}
                    disabled={isBusy}
                  >
                    <Text style={styles.bottomLink}>新規登録</Text>
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
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
  googleButton: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: spacing.sm,
  },
  googleButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
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
