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
import {
  CalendarIcon,
  CheckCircleIcon,
  GoogleIcon,
  WarningCircleIcon,
} from "@/components/icons";

export default function CalendarSettingsScreen() {
  const router = useRouter();
  const {
    data,
    loading,
    saving,
    error,
    googleAuthAvailable,
    linkGoogle,
    syncNow,
    disconnectGoogle,
    connectDevice,
  } = useCalendarSettings();

  const googleConnected = data?.google.connected ?? false;

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
            予定を取り込んで、チームが休みやすい時間を見つけます。取り込んだ予定はスケジュール画面で編集・削除できます。
          </Text>

          {/* Google カレンダー */}
          <Card>
            <View style={styles.row}>
              <GoogleIcon size={28} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Google カレンダー</Text>
                <Text style={styles.rowSub}>
                  {data?.google.email ?? "未連携"}
                </Text>
              </View>
              {/* Figma: 連携済み(S06-04) / 連携エラー(S06-05) の2状態 */}
              {error ? (
                <View style={styles.badge}>
                  <WarningCircleIcon size={14} />
                  <Text style={[styles.badgeText, styles.badgeTextError]}>
                    連携エラー
                  </Text>
                </View>
              ) : data?.google.connected ? (
                <View style={styles.badge}>
                  <CheckCircleIcon size={14} color={colors.textBrand} />
                  <Text style={styles.badgeText}>連携済み</Text>
                </View>
              ) : null}
            </View>

            <Hairline />

            {googleConnected ? (
              <>
                <View style={styles.syncRow}>
                  <Text style={styles.syncMeta}>
                    最終更新: {data?.google.lastSyncedLabel ?? "未同期"}
                  </Text>
                  <Pressable
                    onPress={syncNow}
                    accessibilityRole="button"
                    hitSlop={6}
                  >
                    <Text style={styles.syncAction}>
                      {error ? "再試行" : "今すぐ同期"}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={disconnectGoogle}
                  accessibilityRole="button"
                  hitSlop={6}
                >
                  <Text style={styles.disconnect}>連携を解除</Text>
                </Pressable>
              </>
            ) : googleAuthAvailable ? (
              <PillButton
                variant="outline"
                label="Google と連携"
                onPress={linkGoogle}
                loading={saving}
                textStyle={styles.connectText}
                style={styles.connectButton}
              />
            ) : (
              <Text style={styles.syncMeta}>
                この環境では Google 連携は利用できません
              </Text>
            )}
          </Card>

          {error ? (
            <View style={styles.errorBanner}>
              <WarningCircleIcon size={20} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

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
    // Figma（node 733:5310）は塗り無し。px10 py4 の余白だけ持つ。
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTextError: {
    color: colors.textDanger,
  },
  errorBanner: {
    // Figma（node 733:5331）は塗り無し。px14 py12 / r16 / gap10。
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textDanger,
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
