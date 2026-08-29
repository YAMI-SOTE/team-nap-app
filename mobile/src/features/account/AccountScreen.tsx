import { useEffect, useState } from "react";
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

import { useAccountSettings } from "@/hooks/useAccountSettings";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import LabeledInput from "@/components/LabeledInput";
import PillButton from "@/components/PillButton";

export default function AccountScreen() {
  const router = useRouter();
  const { data, loading, saving, error, save } = useAccountSettings();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!data) {
      return;
    }

    setUsername(data.username);
    setEmail(data.email);
  }, [data]);

  const handleChangePhoto = () => console.log("TODO: change profile photo");
  const handleSave = () =>
    save({
      username,
      email,
    });
  const handleLogout = () => {
    // No auth token to clear in the current mock auth — just return to login.
    router.replace("/login");
  };
  const handleDeleteAccount = () => console.log("TODO: delete the account");

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title="アカウント情報"
            onBack={() => router.back()}
          />

          <View style={styles.avatar}>
            <View style={styles.avatarPlaceholder} />
            <Pressable
              onPress={handleChangePhoto}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.changePhoto}>写真を変更</Text>
            </Pressable>
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
          </View>

          <PillButton
            variant="primary"
            label="保存する"
            elevated={false}
            onPress={handleSave}
            loading={saving}
          />

          <View style={styles.spacer} />

          <View style={styles.statusBlock}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.danger}>
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.logoutText}>ログアウト</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.deleteText}>アカウントを削除</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    gap: 8,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderBrand,
  },
  changePhoto: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
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
