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
import OrDivider from "@/components/OrDivider";

export default function SignUpScreen() {
  const router = useRouter();
  const {
    name,
    email,
    password,
    confirmPassword,
    isSubmitting,
    isGoogleSubmitting,
    errorMessage,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
    submitWithGoogle,
  } = useSignUp();

  const isBusy = isSubmitting || isGoogleSubmitting;

  const handleSubmit = async () => {
    const result: LoginResult | null = await submit();
    if (result) {
      router.replace("/home");
    }
  };

  const handleGoogleSubmit = async () => {
    const result: LoginResult | null = await submitWithGoogle();
    if (result) {
      router.replace("/home");
    }
  };

  return (
    <SkyBackground>
      <StatusBar barStyle="dark-content" />
      {/* 上部の余白（イラスト/装飾が入る想定のスペース） */}
      <SafeAreaView style={styles.topSpacerSafeArea} edges={["top"]} />

      <View style={styles.card}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.heading}>準備完了！</Text>
              <Text style={styles.subtitle}>
                アカウントを作成して{"\n"}TEAM NAPをはじめましょう。
              </Text>

              <View style={styles.formArea}>
                <Text style={styles.label}>名前</Text>
                <TextInput
                  style={styles.input}
                  placeholder="山田太郎"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isBusy}
                  testID="signup-name-input"
                />

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
                  testID="signup-email-input"
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
                  testID="signup-password-input"
                />

                {/*
                  Figmaのモックアップではこの欄のラベルが「メールアドレス」に
                  なっているが、内容（パスワードを再入力）と明らかに矛盾するため
                  元データの誤植と判断し、意味の通る「パスワード（確認用）」を採用。
                  デザイン側の確認が取れたら要調整。
                */}
                <Text style={styles.label}>パスワード（確認用）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="パスワードを再入力"
                  placeholderTextColor={colors.placeholder}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isBusy}
                  testID="signup-confirm-password-input"
                />

                {errorMessage ? (
                  <Text style={styles.errorText} testID="signup-error-text">
                    {errorMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={isBusy}
                  testID="signup-submit-button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryButtonText}>アカウントを作成</Text>
                  )}
                </TouchableOpacity>

                <OrDivider />

                <TouchableOpacity
                  style={[styles.googleButton, isBusy && styles.buttonDisabled]}
                  onPress={handleGoogleSubmit}
                  activeOpacity={0.85}
                  disabled={isBusy}
                  testID="signup-google-button"
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
                        Googleで続ける
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>
                    すでにアカウントをお持ちですか？{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login")}
                    disabled={isBusy}
                  >
                    <Text style={styles.bottomLink}>ログイン</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  // 画面上部の余白。背景（SkyBackground）が見える帯として残す。
  topSpacerSafeArea: {
    height: "18%",
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textBrand,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
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
