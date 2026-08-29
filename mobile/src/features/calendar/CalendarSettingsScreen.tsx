import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import PillButton from "@/components/PillButton";
import { CalendarIcon, CheckCircleIcon } from "@/components/icons";

// UI-only for now — no calendar backend / OAuth wired up yet.
// TODO: back with a `useCalendarIntegrations` hook once the endpoint exists.
const GOOGLE_CALENDAR = {
  email: "user@example.com",
  lastSyncedLabel: "5分前",
};

export default function CalendarSettingsScreen() {
  const router = useRouter();

  const handleSyncNow = () => {
    console.log("TODO: trigger a Google Calendar sync");
  };

  const handleDisconnectGoogle = () => {
    console.log("TODO: disconnect Google Calendar");
  };

  const handleConnectDevice = () => {
    console.log("TODO: connect the device calendar (expo-calendar)");
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="カレンダー連携"
            onBack={() => router.back()}
          />

          <Text style={styles.description}>
            予定を読み取って、チームが休みやすい時間を見つけます。予定の内容は保存しません。
          </Text>

          {/* Google カレンダー */}
          <Card>
            <View style={styles.row}>
              <Image
                source={require("../../../assets/google-icon.png")}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Google カレンダー</Text>
                <Text style={styles.rowSub}>{GOOGLE_CALENDAR.email}</Text>
              </View>
              <View style={styles.badge}>
                <CheckCircleIcon size={14} color={colors.textBrand} />
                <Text style={styles.badgeText}>連携済み</Text>
              </View>
            </View>

            <Hairline />

            <View style={styles.syncRow}>
              <Text style={styles.syncMeta}>
                最終更新: {GOOGLE_CALENDAR.lastSyncedLabel}
              </Text>
              <Pressable
                onPress={handleSyncNow}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={styles.syncAction}>今すぐ同期</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleDisconnectGoogle}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.disconnect}>連携を解除</Text>
            </Pressable>
          </Card>

          {/* 端末のカレンダー */}
          <Card>
            <View style={styles.row}>
              <CalendarIcon size={26} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>端末のカレンダー</Text>
                <Text style={styles.rowSub}>未連携</Text>
              </View>
            </View>

            <PillButton
              variant="outline"
              label="連携する"
              onPress={handleConnectDevice}
              textStyle={styles.connectText}
              style={styles.connectButton}
            />
          </Card>
        </ScrollView>
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
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  googleIcon: {
    width: 28,
    height: 28,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brandSubtle,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textBrand,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncMeta: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  syncAction: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  disconnect: {
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textDanger,
  },
  connectButton: {
    height: 47,
    minHeight: 47,
  },
  connectText: {
    fontSize: 14,
  },
});
