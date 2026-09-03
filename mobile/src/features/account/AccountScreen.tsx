import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/features/auth/AuthContext";
import { updateProfile } from "@/services/authApi";
import { ApiError } from "@/services/api";
import { colors } from "@/theme/colors";
import { isAvatarId, type AvatarId } from "@/constants/avatars";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import ScreenHeader from "@/components/ScreenHeader";
import LabeledInput from "@/components/LabeledInput";
import PillButton from "@/components/PillButton";
import SettingsRow from "@/components/SettingsRow";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "アカウント情報" — reads the signed-in user (name / email registered at
 * sign-up) and saves via PATCH /auth/me. Changing the email requires
 * typing the new address twice.
 */
export default function AccountScreen() {
  const router = useRouter();
  const { user, refresh, signOut, deleteAccount } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.name ?? "");
    setEmail(user.email);
    setEmailConfirm("");
    setAvatarId(isAvatarId(user.avatar) ? user.avatar : null);
  }, [user]);

  const avatarChanged = useMemo(
    () => user != null && avatarId !== (isAvatarId(user.avatar) ? user.avatar : null),
    [avatarId, user],
  );

  const emailChanged = useMemo(
    () => user != null && email.trim().toLowerCase() !== user.email.toLowerCase(),
    [email, user],
  );

  const handleSave = async () => {
    if (!user) return;
    setError(null);
    setSavedNote(null);

    const nextName = username.trim();
    if (!nextName) {
      setError("ユーザー名を入力してください");
      return;
    }
    if (emailChanged) {
      if (!EMAIL_REGEX.test(email.trim())) {
        setError("メールアドレスの形式が正しくありません");
        return;
      }
      if (email.trim() !== emailConfirm.trim()) {
        setError("確認用のメールアドレスが一致しません");
        return;
      }
    }

    const patch: { name?: string; email?: string; avatar?: string | null } = {};
    if (nextName !== (user.name ?? "")) patch.name = nextName;
    if (emailChanged) patch.email = email.trim();
    if (avatarChanged) patch.avatar = avatarId;
    if (Object.keys(patch).length === 0) {
      setSavedNote("変更はありません");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(patch);
      await refresh();
      setEmailConfirm("");
      setSavedNote("保存しました");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("このメールアドレスは既に使われています");
      } else {
        setError(err instanceof Error ? err.message : "保存できませんでした");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    router.replace("/login");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      router.replace("/login");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      setError(
        err instanceof Error ? err.message : "アカウントを削除できませんでした",
      );
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title="アカウント情報" onBack={() => router.back()} />

          <View style={styles.avatar}>
            <Avatar
              avatarId={avatarId}
              name={user?.name}
              size={AVATAR_SIZE}
              ring
            />
            <Text style={styles.changePhoto}>アイコンを選ぶ</Text>
            <AvatarPicker
              selected={avatarId}
              onSelect={setAvatarId}
              disabled={saving}
            />
          </View>

          <View style={styles.form}>
            <LabeledInput
              label="ユーザー名"
              placeholder="ユーザー名"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <LabeledInput
              label="メールアドレス"
              placeholder="user@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailChanged ? (
              <LabeledInput
                label="新しいメールアドレス（確認）"
                placeholder="同じメールアドレスをもう一度"
                value={emailConfirm}
                onChangeText={setEmailConfirm}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}
          </View>

          {/* Figma（node 733:5269）にある行。
              TODO(backend): ログイン中専用の変更画面が無いため、
              いまは再設定フロー（/forgot-password）へ送っている。 */}
          <SettingsRow
            label="パスワードを変更"
            onPress={() => router.push("/forgot-password")}
          />

          <PillButton
            variant="primary"
            label="保存する"
            elevated={false}
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />

          <View style={styles.statusBlock}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {savedNote ? (
              <Text style={styles.savedText}>{savedNote}</Text>
            ) : null}
          </View>

          <View style={styles.spacer} />

          <View style={styles.danger}>
            <Pressable
              onPress={() => setLogoutOpen(true)}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.logoutText}>ログアウト</Text>
            </Pressable>
            <Pressable
              onPress={() => setDeleteOpen(true)}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.deleteText}>アカウントを削除</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={logoutOpen}
        title="ログアウトしますか？"
        message="このデバイスのセッションを終了します。もう一度ログインが必要になります。"
        confirmLabel="ログアウト"
        confirmAgainLabel="本当にログアウトする"
        doubleConfirm
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
      <ConfirmDialog
        visible={deleteOpen}
        title="アカウントを削除しますか？"
        message="アカウント・チームメンバー情報・設定がすべて削除されます。この操作は取り消せません。"
        confirmLabel="アカウントを削除"
        confirmAgainLabel="完全に削除する"
        destructive
        doubleConfirm
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </View>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  avatar: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  changePhoto: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  saveButton: {
    // Figma: py10 + 16px/1.7 の1行 = 47px
    minHeight: 47,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  danger: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  statusBlock: {
    minHeight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
  savedText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textBrand,
    textAlign: "center",
  },
  logoutText: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  deleteText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textDanger,
  },
});
