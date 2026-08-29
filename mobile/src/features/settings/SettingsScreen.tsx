import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import SettingsSection from "@/components/SettingsSection";
import SettingsRow from "@/components/SettingsRow";
import Toggle from "@/components/Toggle";
import { BellIcon } from "@/components/icons";

type NotificationKey =
  | "napSuggestion"
  | "napEnd"
  | "teamNapSuggestion"
  | "wakeSupport";

// Defaults match the Figma design (all on). TODO: load + persist via a
// settings endpoint once the backend contract exists.
const INITIAL_NOTIFICATIONS: Record<NotificationKey, boolean> = {
  napSuggestion: true,
  napEnd: true,
  teamNapSuggestion: true,
  wakeSupport: true,
};

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const setNotification = (key: NotificationKey) => (value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    // TODO: persist the change.
  };

  const openTodo = (label: string) => () => {
    console.log(`TODO: open "${label}" screen`);
  };

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
              onPress={openTodo("通知")}
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
                  value={notifications.napSuggestion}
                  onValueChange={setNotification("napSuggestion")}
                />
              }
            />
            <SettingsRow
              label="仮眠の終了"
              trailing={
                <Toggle
                  value={notifications.napEnd}
                  onValueChange={setNotification("napEnd")}
                />
              }
            />
            <SettingsRow
              label="チームからの仮眠提案"
              trailing={
                <Toggle
                  value={notifications.teamNapSuggestion}
                  onValueChange={setNotification("teamNapSuggestion")}
                />
              }
            />
            <SettingsRow
              label="メンバーからの起床サポート"
              trailing={
                <Toggle
                  value={notifications.wakeSupport}
                  onValueChange={setNotification("wakeSupport")}
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
});
