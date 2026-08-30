import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { colors } from "@/theme/colors";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import SettingsSection from "@/components/SettingsSection";
import SettingsRow from "@/components/SettingsRow";
import Toggle from "@/components/Toggle";
import { BellIcon } from "@/components/icons";

export default function SettingsScreen() {
  const router = useRouter();
  const { data, loading, error, setNotification } = useNotificationSettings();

  const handleLogout = () => {
    // No auth token to clear in the current mock auth — just return to login.
    router.replace("/login");
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <Pressable
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel="通知"
              hitSlop={8}
            >
              <BellIcon size={24} color={colors.primary} />
            </Pressable>
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
              trailing={
                <Toggle
                  value={data?.napSuggestion ?? false}
                  onValueChange={(value) => setNotification("napSuggestion", value)}
                />
              }
            />
            <SettingsRow
              label="仮眠の終了"
              trailing={
                <Toggle
                  value={data?.napEnd ?? false}
                  onValueChange={(value) => setNotification("napEnd", value)}
                />
              }
            />
            <SettingsRow
              label="チームからの仮眠提案"
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
            <SettingsRow label="ログアウト" danger onPress={handleLogout} />
          </SettingsSection>

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
      </SafeAreaView>
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
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 16,
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
