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

import { useTeamSettings } from "@/hooks/useTeamSettings";
import { colors } from "@/theme/colors";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import ConfirmDialog from "@/components/ConfirmDialog";

import type { TeamSettingsMember } from "@/types/api";

const STATUS_LABEL: Record<TeamSettingsMember["status"], string> = {
  working: "作業中",
  resting: "仮眠中",
  offline: "オフライン",
};

/**
 * "メンバーを管理" — the owner can see the roster and remove members.
 * Non-owners see a read-only list.
 */
export default function ManageMembersScreen() {
  const router = useRouter();
  const { data, loading, saving, error, removeMember } = useTeamSettings();
  const [target, setTarget] = useState<TeamSettingsMember | null>(null);

  const noTeam = !loading && !error && data === null;
  useEffect(() => {
    if (noTeam) router.replace("/team");
  }, [noTeam, router]);

  const canManage = data?.canManage ?? false;

  const confirmRemove = async () => {
    if (!target) return;
    const ok = await removeMember(target.id);
    setTarget(null);
    if (!ok) return;
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="メンバーを管理" onBack={() => router.back()} />

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <Card style={styles.listCard}>
              {(data?.members ?? []).map((m, i) => (
                <View
                  key={m.id}
                  style={[styles.row, i > 0 && styles.rowDivider]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{m.label}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.name}>
                      {m.name ?? "名前未設定"}
                      {m.isSelf ? "（あなた）" : ""}
                    </Text>
                    <Text style={styles.meta}>
                      {m.role === "owner" ? "オーナー ・ " : ""}
                      {STATUS_LABEL[m.status]}
                    </Text>
                  </View>
                  {canManage && !m.isSelf && m.role !== "owner" ? (
                    <Pressable
                      onPress={() => setTarget(m)}
                      disabled={saving}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.name ?? "メンバー"}を削除`}
                    >
                      <Text style={styles.removeText}>削除</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </Card>
          )}

          {!loading && !canManage ? (
            <Text style={styles.hint}>
              メンバーを削除できるのはチームのオーナーだけです。
            </Text>
          ) : null}

          <View style={styles.footer}>
            {saving ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmDialog
        visible={target !== null}
        title="メンバーを削除しますか？"
        message={`${target?.name ?? "このメンバー"}をチームから外します。相手はもう一度招待コードで参加できます。`}
        confirmLabel="削除する"
        confirmAgainLabel="本当に削除する"
        destructive
        doubleConfirm
        loading={saving}
        onConfirm={confirmRemove}
        onCancel={() => setTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 14,
  },
  stateBlock: { paddingVertical: 48, alignItems: "center" },
  listCard: { gap: 0, paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  rowText: { flex: 1, gap: 2 },
  name: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  removeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textDanger,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
    textAlign: "center",
  },
  footer: {
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
});
