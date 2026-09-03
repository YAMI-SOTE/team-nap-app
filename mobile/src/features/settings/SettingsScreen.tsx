import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useAuth } from "@/features/auth/AuthContext";
import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import ConfirmDialog from "@/components/ConfirmDialog";
import Logo from "@/components/Logo";
import SettingsSection from "@/components/SettingsSection";
import SettingsRow from "@/components/SettingsRow";
import Toggle from "@/components/Toggle";
import NotificationBell from "@/components/NotificationBell";

export default function SettingsScreen() {
  const router = useRouter();
  const { data, loading, error, setNotification } = useNotificationSettings();
  const { signOut } = useAuth();

  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell />
          </View>

          <SettingsSection title="アカウント">
            <SettingsRow
              label="アカウント情報"
              onPress={() => router.push("/settings/account")}
            />
            <SettingsRow
              label="睡眠スケジュール"
              onPress={() => router.push("/settings/sleep-schedule")}
            />
          </SettingsSection>

          <SettingsSection title="連携">
            <SettingsRow
              label="カレンダー連携"
              onPress={() => router.push("/settings/calendar")}
            />
          </SettingsSection>

          <SettingsSection title="通知">
            <SettingsRow
              label="仮眠の提案"
              variant="control"
              trailing={
                <Toggle
                  value={data?.napSuggestion ?? false}
                  onValueChange={(value) => setNotification("napSuggestion", value)}
                />
              }
            />
            <SettingsRow
              label="仮眠の終了"
              variant="control"
              trailing={
                <Toggle
                  value={data?.napEnd ?? false}
                  onValueChange={(value) => setNotification("napEnd", value)}
                />
              }
            />
            <SettingsRow
              label="チームからの仮眠提案"
              variant="control"
              trailing={
                <Toggle
                  value={data?.teamNapSuggestion ?? false}
                  onValueChange={(value) =>
                    setNotification("teamNapSuggestion", value)
                  }
                />
              }
            />
            <SettingsRow
              label="メンバーからの起床サポート"
              variant="control"
              trailing={
                <Toggle
                  value={data?.wakeSupport ?? false}
                  onValueChange={(value) => setNotification("wakeSupport", value)}
                />
              }
            />
          </SettingsSection>

          <SettingsSection title="チーム">
            <SettingsRow
              label="チーム設定"
              onPress={() => router.push("/settings/team")}
            />
            <SettingsRow
              label="ログアウト"
              danger
              onPress={() => setLogoutOpen(true)}
            />
          </SettingsSection>

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    </View>
  );
}

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
    // Figma（node 733:5240）は上詰め＋セクション間 32px 固定。
    // justifyContent: "space-between" だと画面高に応じてセクション間が
    // 伸び縮みして、余白がデザインとズレる。
    gap: 32,
    // Figma は画面上端から 63px。SafeAreaView の上インセット（≒59）を
    // 差し引いた分だけをここで足す。
    paddingTop: 4,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  footer: {
    minHeight: 20,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
});
