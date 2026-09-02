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
import { radius } from "@/theme/spacing";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import MemberActionsSheet from "@/components/MemberActionsSheet";
import DefaultAvatar, { defaultAvatarFor } from "@/components/DefaultAvatar";
import PillButton from "@/components/PillButton";
import { DotsThreeIcon, UsersThreeIcon } from "@/components/icons";

import type { TeamSettingsMember } from "@/types/api";

/**
 * メンバー管理（Figma S06-07_Member_Manage, node 862:3683）。
 *
 * 行末の「…」で操作シート（OV-06）を開き、そこから削除確認（OV-07）へ。
 * 削除できるのはオーナーだけ、という上流の権限判定はそのまま使う。
 */

const STATUS_LABEL: Record<TeamSettingsMember["status"], string> = {
  working: "作業中",
  resting: "仮眠中",
  offline: "オフライン",
};

const STATUS_COLOR: Record<TeamSettingsMember["status"], string> = {
  working: colors.textSecondary,
  resting: colors.primary,
  offline: colors.textTertiary,
};

export default function ManageMembersScreen() {
  const router = useRouter();
  const { data, loading, saving, error, removeMember } = useTeamSettings();
  const [actionTarget, setActionTarget] = useState<TeamSettingsMember | null>(
    null,
  );
  const [removeTarget, setRemoveTarget] = useState<TeamSettingsMember | null>(
    null,
  );

  const noTeam = !loading && !error && data === null;
  useEffect(() => {
    if (noTeam) router.replace("/team");
  }, [noTeam, router]);

  const canManage = data?.canManage ?? false;
  const members = data?.members ?? [];

  const confirmRemove = async () => {
    if (!removeTarget) return;
    await removeMember(removeTarget.id);
    setRemoveTarget(null);
  };

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="メンバー管理" onBack={() => router.back()} />

          <View style={styles.head}>
            <Text style={styles.headTitle}>メンバー</Text>
            <Text style={styles.headCount}>{members.length}人</Text>
          </View>

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.listCard}>
              {members.map((m, i) => (
                <View key={m.id}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <DefaultAvatar type={defaultAvatarFor(m.id)} size={40} />

                    <View style={styles.rowText}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>
                          {m.name ?? "名前未設定"}
                        </Text>
                        {m.isSelf ? (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>あなた</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.status,
                          { color: STATUS_COLOR[m.status] },
                        ]}
                      >
                        {STATUS_LABEL[m.status]}
                      </Text>
                    </View>

                    {m.role === "owner" ? (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>管理者</Text>
                      </View>
                    ) : null}

                    {canManage && !m.isSelf && m.role !== "owner" ? (
                      <Pressable
                        onPress={() => setActionTarget(m)}
                        disabled={saving}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`${m.name ?? "メンバー"}の操作`}
                      >
                        <DotsThreeIcon size={20} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <PillButton
            variant="outline"
            label="メンバーを招待"
            onPress={() => router.push("/team/invite")}
            icon={<UsersThreeIcon size={20} color={colors.textBrand} />}
            style={styles.inviteButton}
            textStyle={styles.inviteLabel}
          />

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

      {/* OV-06_Member_Actions */}
      <MemberActionsSheet
        visible={actionTarget !== null}
        name={actionTarget?.name ?? "メンバー"}
        subtitle={
          actionTarget
            ? `メンバー ・ ${STATUS_LABEL[actionTarget.status]}`
            : ""
        }
        avatar={defaultAvatarFor(actionTarget?.id ?? "")}
        // TODO(backend): 管理者へ昇格する API が無いため、この操作は出さない。
        canPromote={false}
        onPromote={() => setActionTarget(null)}
        onRemove={() => {
          setRemoveTarget(actionTarget);
          setActionTarget(null);
        }}
        onCancel={() => setActionTarget(null)}
      />

      {/* OV-07_Member_Remove_Confirm */}
      <ConfirmDialog
        visible={removeTarget !== null}
        title={`${removeTarget?.name ?? "このメンバー"}さんを\nチームから外しますか？`}
        message={
          "これまでの仮眠記録は残りますが、チームの統計には含まれなくなります。"
        }
        confirmLabel="チームから外す"
        confirmAgainLabel="本当に外す"
        destructive
        doubleConfirm
        loading={saving}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
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
  head: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headTitle: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headCount: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  stateBlock: { paddingVertical: 48, alignItems: "center" },
  listCard: {
    // Figma（node 863:3701）: 白 / r20 / py4 / 影 0 1 1.5 + 0 4 6
    width: "100%",
    borderRadius: 20,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    shadowColor: "#12292B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(18,41,43,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: "rgba(18,41,43,0.06)",
  },
  youBadgeText: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  status: {
    fontSize: 11,
    lineHeight: 18,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,156,160,0.1)",
  },
  adminBadgeText: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.textBrand,
  },
  inviteButton: {
    height: 47,
    paddingVertical: 0,
  },
  inviteLabel: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
    textAlign: "center",
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
