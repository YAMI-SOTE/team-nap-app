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

import { useCalendarSettings } from "@/hooks/useCalendarSettings";
import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import PillButton from "@/components/PillButton";
import { CalendarIcon, CheckCircleIcon, GoogleIcon } from "@/components/icons";

export default function CalendarSettingsScreen() {
  const router = useRouter();
  const { data, loading, saving, error, syncNow, disconnectGoogle, connectDevice } =
    useCalendarSettings();

  return (
    <View style={styles.root}>
      <AppBackground />
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
              <GoogleIcon size={20} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Google カレンダー</Text>
                <Text style={styles.rowSub}>
                  {data?.google.email ?? "未連携"}
                </Text>
              </View>
              {data?.google.connected ? (
                <View style={styles.badge}>
                  <CheckCircleIcon size={14} color={colors.textBrand} />
                  <Text style={styles.badgeText}>連携済み</Text>
                </View>
              ) : null}
            </View>

            <Hairline />

            <View style={styles.syncRow}>
              <Text style={styles.syncMeta}>
                最終更新: {data?.google.lastSyncedLabel ?? "未同期"}
              </Text>
              <Pressable
                onPress={syncNow}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={styles.syncAction}>今すぐ同期</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={disconnectGoogle}
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
                <Text style={styles.rowSub}>
                  {data?.device.connected ? "連携済み" : "未連携"}
                </Text>
              </View>
            </View>

            <PillButton
              variant="outline"
              label="連携する"
              onPress={connectDevice}
              loading={saving}
              textStyle={styles.connectText}
              style={styles.connectButton}
            />
          </Card>

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
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
  footer: {
    minHeight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
});
