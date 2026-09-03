import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { spacing, radius } from "@/theme/spacing";
import {
  AuthError,
  confirmPasswordReset,
  requestPasswordReset,
} from "@/services/authService";
import EntryBackground from "@/components/EntryBackground";
import KeyboardDismiss from "@/components/KeyboardDismiss";
import Logo from "@/components/Logo";
import ConfirmDialog from "@/components/ConfirmDialog";
import PasswordInput from "@/components/PasswordInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * "パスワードをお忘れですか？" — request a reset, then set a new password.
 * There is no mail infra yet, so outside production the API returns the
 * token in the response and we pre-fill it.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleRequest = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("メールアドレスの形式が正しくありません");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { resetToken } = await requestPasswordReset(email);
      setNotice(
        "登録済みのメールアドレスならリセット用のリンクを送信しました。",
      );
      if (resetToken) {
        setToken(resetToken); // dev convenience — pre-fill the token
      }
      setPhase("confirm");
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : "通信エラーが発生しました",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!token.trim()) {
      setError("リセットコードを入力してください");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`);
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : "通信エラーが発生しました",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <EntryBackground>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <KeyboardDismiss>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Logo width={110} color={colors.primary} style={styles.logo} />
              <Text style={styles.heading}>パスワードの再設定</Text>

              {phase === "request" ? (
                <>
                  <Text style={styles.subtitle}>
                    登録したメールアドレスを入力してください。
                  </Text>
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
                    editable={!busy}
                    testID="forgot-email-input"
                  />
                  <PrimaryButton
                    label="リセットリンクを送る"
                    busy={busy}
                    onPress={handleRequest}
                    testID="forgot-request-button"
                  />
                </>
              ) : null}

              {phase === "confirm" ? (
                <>
                  {notice ? (
                    <Text style={styles.notice}>{notice}</Text>
                  ) : null}
                  <Text style={styles.label}>リセットコード</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="メールに記載されたコード"
                    placeholderTextColor={colors.placeholder}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                    testID="forgot-token-input"
                  />
                  <Text style={styles.label}>新しいパスワード</Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder="8文字以上"
                    placeholderTextColor={colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    editable={!busy}
                    testID="forgot-password-input"
                  />
                  <Text style={styles.label}>新しいパスワード（確認）</Text>
                  <PasswordInput
                    style={styles.input}
                    placeholder="もう一度入力"
                    placeholderTextColor={colors.placeholder}
                    value={confirm}
                    onChangeText={setConfirm}
                    editable={!busy}
                    testID="forgot-confirm-input"
                  />
                  <PrimaryButton
                    label="パスワードを再設定"
                    busy={busy}
                    onPress={handleConfirm}
                    testID="forgot-confirm-button"
                  />
                </>
              ) : null}

              {error ? (
                <Text style={styles.errorText} testID="forgot-error-text">
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace("/login")}
                disabled={busy}
              >
                <Text style={styles.backLinkText}>ログインに戻る</Text>
              </TouchableOpacity>
            </ScrollView>
        </KeyboardDismiss>
      </SafeAreaView>

      <ConfirmDialog
        visible={phase === "done"}
        title="パスワードを再設定しました"
        message="新しいパスワードでログインしてください。すべてのデバイスのログインは解除されています。"
        confirmLabel="ログインへ"
        hideCancel
        onConfirm={() => router.replace("/login")}
        onCancel={() => router.replace("/login")}
      />
    </EntryBackground>
  );
}

function PrimaryButton({
  label,
  busy,
  onPress,
  testID,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, busy && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={busy}
      testID={testID}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  logo: { width: 110, height: 55, marginBottom: spacing.lg },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  notice: {
    fontSize: 13,
    color: colors.textBrand,
    lineHeight: 20,
    marginBottom: spacing.lg,
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
    minHeight: 48,
    fontSize: 16,
    color: colors.textPrimary,
    includeFontPadding: false,
    textAlignVertical: "center",
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: spacing.xs,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "bold" },
  buttonDisabled: { opacity: 0.7 },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  backLink: { marginTop: spacing.xl, alignSelf: "center" },
  backLinkText: { fontSize: 13, fontWeight: "bold", color: colors.primary },
});
