import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useSignUp } from "@/hooks/useSignUp";
import type { LoginResult } from "@/services/authService";
import EntryBackground from "@/components/EntryBackground";
import KeyboardDismiss from "@/components/KeyboardDismiss";
import LabeledInput from "@/components/LabeledInput";
import PillButton from "@/components/PillButton";
import { GoogleIcon } from "@/components/icons";

/**
 * アカウント作成画面（Figma "S01-07_SignUp", node 733:4416）。
 *
 * 背景イラストの上に、下端から生える角丸 32px の白いカード
 * （"Group / 準備完了！", node 733:4420）。カードは px24 / py32 で、
 * 中の要素は 16px 間隔。カード上の余白は Spacer（flex）で押し上げる。
 */
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

  // 新規アカウントは未オンボーディングなので、必ずオンボーディングを通す。
  const handleSubmit = async () => {
    const result: LoginResult | null = await submit();
    if (result) {
      router.replace(result.user.onboardingCompleted ? "/home" : "/onboarding");
    }
  };

  const handleGoogleSubmit = async () => {
    const result: LoginResult | null = await submitWithGoogle();
    if (result) {
      router.replace(result.user.onboardingCompleted ? "/home" : "/onboarding");
    }
  };

  return (
    <EntryBackground>
      <StatusBar style="dark" />
      <KeyboardDismiss>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.heading}>準備完了！</Text>
              <Text style={styles.subtitle}>
                アカウントを作成して{"\n"}TEAM NAPをはじめましょう。
              </Text>

              <LabeledInput
                label="名前"
                placeholder="山田太郎"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!isBusy}
                testID="signup-name-input"
              />

              <LabeledInput
                label="メールアドレス"
                placeholder="example@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                testID="signup-email-input"
              />

              <LabeledInput
                label="パスワード"
                placeholder="パスワードを入力"
                value={password}
                onChangeText={setPassword}
                revealToggle
                editable={!isBusy}
                testID="signup-password-input"
              />

              {/*
                Figmaのモックアップではこの欄のラベルが「メールアドレス」に
                なっているが、内容（パスワードを再入力）と明らかに矛盾するため
                元データの誤植と判断し、意味の通る「パスワード（確認用）」を採用。
                デザイン側の確認が取れたら要調整。
              */}
              <LabeledInput
                label="パスワード（確認用）"
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                revealToggle
                editable={!isBusy}
                testID="signup-confirm-password-input"
              />

              {errorMessage ? (
                <Text style={styles.errorText} testID="signup-error-text">
                  {errorMessage}
                </Text>
              ) : null}

              <PillButton
                label="アカウントを作成"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isBusy}
                elevated={false}
                style={styles.primaryButton}
                testID="signup-submit-button"
              />

              {/*
                この画面の「または」はログイン画面（Or, node 733:4288）とは別物で、
                140px 固定の罫線を 4px 間隔で中央に置く（node 733:4432）。
              */}
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>または</Text>
                <View style={styles.orLine} />
              </View>

              <PillButton
                variant="outline"
                label="Google で続ける"
                onPress={handleGoogleSubmit}
                loading={isGoogleSubmitting}
                disabled={isBusy}
                icon={
                  <GoogleIcon size={20} />
                }
                style={styles.googleButton}
                textStyle={styles.googleButtonText}
                testID="signup-google-button"
              />

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>
                  すでにアカウントをお持ちですか？
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/login")}
                  disabled={isBusy}
                >
                  <Text style={styles.loginLink}>ログイン</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
      </KeyboardDismiss>
    </EntryBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // Spacer（node 733:4419）に相当。カードを下端から生やす。
    justifyContent: "flex-end",
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heading: {
    // Figma: Heading/H2 — 24px / 1.4 / 700
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textBrand,
    textAlign: "center",
  },
  subtitle: {
    // Figma: Body/M-Medium — 14px / 1.7 / 500
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textTertiary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.error,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 47,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  orLine: {
    width: 140,
    height: 1,
    backgroundColor: colors.borderDefault,
  },
  orText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.placeholder,
    textAlign: "center",
  },
  googleButton: {
    borderColor: colors.borderStrong,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  loginText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  loginLink: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
