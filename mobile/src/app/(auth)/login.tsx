import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useLogin } from "@/hooks/useLogin";
import EntryBackground from "@/components/EntryBackground";
import LabeledInput from "@/components/LabeledInput";
import OrDivider from "@/components/OrDivider";
import PillButton from "@/components/PillButton";
import { GoogleIcon } from "@/components/icons";
import Logo from "@/components/Logo";

/**
 * ログイン画面（Figma "S01-02_Login", node 733:4277）。
 *
 * Content は px24 / pt63 / pb24 の中央寄せスタックで、要素間は 16px。
 * ロゴ → 見出し → フォーム（12px 間隔）→ ログイン → または → Google →
 * 新規登録リンク、の順に並ぶ。
 */
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
    <EntryBackground>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Logo width={68} color={colors.primary} />

            <View style={styles.heading}>
              <Text style={styles.title}>おかえりなさい</Text>
              <Text style={styles.subtitle}>
                メールアドレスでログインしてください
              </Text>
            </View>

            <View style={styles.form}>
              <LabeledInput
                label="メールアドレス"
                placeholder="example@gmail.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                testID="login-email-input"
              />

              <LabeledInput
                label="パスワード"
                placeholder="パスワードを入力"
                value={password}
                onChangeText={setPassword}
                revealToggle
                editable={!isBusy}
                testID="login-password-input"
              />

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => router.push("/forgot-password")}
                disabled={isBusy}
                accessibilityRole="link"
              >
                <Text style={styles.forgotLinkText}>
                  パスワードをお忘れですか？
                </Text>
              </TouchableOpacity>
            </View>

            <PillButton
              label="ログイン"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isBusy}
              elevated={false}
              style={styles.primaryButton}
              testID="login-submit-button"
            />

            <OrDivider />

            <PillButton
              variant="outline"
              label="Googleでログイン"
              onPress={handleGoogleSubmit}
              loading={isGoogleSubmitting}
              disabled={isBusy}
              icon={
                <GoogleIcon size={20} />
              }
              style={styles.googleButton}
              textStyle={styles.googleButtonText}
              testID="login-google-button"
            />

            {errorMessage ? (
              <Text style={styles.errorText} testID="login-error-text">
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.signUpRow}>
              <Text style={styles.signUpText}>アカウントをお持ちでない方は</Text>
              <TouchableOpacity
                onPress={() => router.replace("/signup")}
                disabled={isBusy}
              >
                <Text style={styles.signUpLink}>新規登録</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </EntryBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 63,
    paddingBottom: 24,
  },
  heading: {
    width: "100%",
    gap: 4,
  },
  title: {
    // Figma: Heading/H1 — 28px / 1.4 / 700
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    // Figma: Body/S-Regular — 13px / 1.6
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  forgotLink: {
    alignSelf: "flex-end",
  },
  forgotLinkText: {
    // Figma: Caption/Bold — 12px / 1.6 / 700
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  primaryButton: {
    minHeight: 47,
  },
  googleButton: {
    minHeight: 47,
    borderColor: colors.borderDefault,
    paddingHorizontal: 12,
  },
  googleButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.error,
    textAlign: "center",
  },
  signUpRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  signUpText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  signUpLink: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
