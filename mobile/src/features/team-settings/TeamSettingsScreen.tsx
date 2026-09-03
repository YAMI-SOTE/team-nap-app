import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useTeamSettings } from "@/hooks/useTeamSettings";
import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import InviteCodeCard from "@/components/InviteCodeCard";
import MemberRow, { type MemberRowMember } from "@/components/MemberRow";
import PillButton from "@/components/PillButton";
import {
  CheckCircleIcon,
  PencilSimpleIcon,
  UsersThreeIcon,
} from "@/components/icons";

export default function TeamSettingsScreen() {
  const router = useRouter();
  const { data, loading, saving, error, leave, rename } = useTeamSettings();

  // No current team (e.g. just left) → send to the Team tab empty state.
  const noTeam = !loading && !error && data === null;
  useEffect(() => {
    if (noTeam) {
      router.replace("/team");
    }
  }, [noTeam, router]);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startEditName = () => {
    setNameDraft(data?.teamName ?? "");
    setEditingName(true);
  };
  const cancelEditName = () => setEditingName(false);
  const submitName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === data?.teamName) {
      setEditingName(false);
      return;
    }
    const ok = await rename(trimmed);
    if (ok) setEditingName(false);
  };

  const handleManageMembers = () => router.push("/settings/team-members");
  const handleLeaveTeam = async () => {
    const success = await leave();
    if (success) {
      router.replace("/settings");
    }
  };

  if (noTeam) {
    return (
      <View style={styles.root}>
        <AppBackground />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader title="チーム設定" onBack={() => router.back()} />

          {/* チーム名 */}
          <Card style={styles.rowCard}>
            <View style={styles.rowCardText}>
              <Text style={styles.caption}>チーム名</Text>
              {editingName ? (
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  autoFocus
                  maxLength={50}
                  editable={!saving}
                  returnKeyType="done"
                  onSubmitEditing={submitName}
                  placeholder="チーム名"
                  placeholderTextColor={colors.placeholder}
                />
              ) : (
                <Text style={styles.teamName}>
                  {data?.teamName ?? "読み込み中"}
                </Text>
              )}
            </View>

            {editingName ? (
              <View style={styles.nameActions}>
                <Pressable
                  onPress={submitName}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="チーム名を保存"
                  hitSlop={8}
                >
                  <CheckCircleIcon size={22} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={cancelEditName}
                  accessibilityRole="button"
                  accessibilityLabel="編集をキャンセル"
                  hitSlop={8}
                >
                  <Text style={styles.cancelText}>キャンセル</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={startEditName}
                accessibilityRole="button"
                accessibilityLabel="チーム名を編集"
                hitSlop={8}
              >
                <PencilSimpleIcon size={20} color={colors.textTertiary} />
              </Pressable>
            )}
          </Card>

          {/* メンバー */}
          <Card>
            <View style={styles.head}>
              <Text style={styles.headTitle}>メンバー</Text>
              <Text style={styles.headMeta}>{data?.memberCount ?? 0}人</Text>
            </View>
            <MemberRow
              members={(data?.members ?? []) as MemberRowMember[]}
              onMemberPress={(id) => router.push(`/members/${id}`)}
              onMorePress={handleManageMembers}
            />
            <PillButton
              variant="outline"
              label="メンバーを管理"
              onPress={handleManageMembers}
              icon={<UsersThreeIcon size={20} color={colors.textBrand} />}
              textStyle={styles.smallButtonText}
              style={styles.smallButton}
            />
          </Card>

          {/* 招待 */}
          <InviteCodeCard code={data?.inviteCode ?? ""} loading={loading} />

          <View style={styles.spacer} />

          <Pressable
            onPress={handleLeaveTeam}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Text style={styles.leaveText}>チームを退出する</Text>
          </Pressable>

          <View style={styles.footer}>
            {loading || saving ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
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

  // チーム名
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowCardText: {
    flex: 1,
    gap: 2,
  },
  caption: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  teamName: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  nameActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },

  // メンバー
  head: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headMeta: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  smallButton: {
    height: 47,
    minHeight: 47,
  },
  smallButtonText: {
    fontSize: 14,
  },

  spacer: {
    flex: 1,
    minHeight: 24,
  },
  leaveText: {
    width: "100%",
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textDanger,
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
