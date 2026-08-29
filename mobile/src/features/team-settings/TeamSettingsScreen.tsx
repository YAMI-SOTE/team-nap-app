import {
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
import MemberRow, { type MemberRowMember } from "@/components/MemberRow";
import PillButton from "@/components/PillButton";
import {
  ClipboardTextIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  UsersThreeIcon,
} from "@/components/icons";

// UI-only for now — no team-settings endpoint yet.
// TODO: back with a `useTeamSettings` hook once the backend contract exists.
const TEAM_NAME = "TEAM NAP 開発チーム";
const MEMBER_COUNT = 11;
const INVITE_CODE = "NAP-4821";
const MEMBERS: MemberRowMember[] = [
  { id: "a", label: "A", status: "resting" },
  { id: "b", label: "B", status: "working" },
  { id: "c", label: "C", status: "working" },
  { id: "d", label: "D", status: "working" },
  { id: "e", label: "E", status: "resting" },
  { id: "f", label: "F", status: "offline" },
];

export default function TeamSettingsScreen() {
  const router = useRouter();

  const handleEditName = () => console.log("TODO: edit the team name");
  const handleManageMembers = () => console.log("TODO: open member management");
  const handleCopyCode = () => console.log("TODO: copy the invite code");
  const handleShareInvite = () => console.log("TODO: share the invite link");
  const handleLeaveTeam = () => console.log("TODO: leave the team");

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="チーム設定" onBack={() => router.back()} />

          {/* チーム名 */}
          <Card style={styles.rowCard}>
            <View style={styles.rowCardText}>
              <Text style={styles.caption}>チーム名</Text>
              <Text style={styles.teamName}>{TEAM_NAME}</Text>
            </View>
            <Pressable
              onPress={handleEditName}
              accessibilityRole="button"
              accessibilityLabel="チーム名を編集"
              hitSlop={8}
            >
              <PencilSimpleIcon size={20} color={colors.textTertiary} />
            </Pressable>
          </Card>

          {/* メンバー */}
          <Card>
            <View style={styles.head}>
              <Text style={styles.headTitle}>メンバー</Text>
              <Text style={styles.headMeta}>{MEMBER_COUNT}人</Text>
            </View>
            <MemberRow
              members={MEMBERS}
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
          <Card style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>招待コード</Text>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{INVITE_CODE}</Text>
              <Pressable
                onPress={handleCopyCode}
                accessibilityRole="button"
                accessibilityLabel="招待コードをコピー"
                hitSlop={8}
              >
                <ClipboardTextIcon size={20} color={colors.textTertiary} />
              </Pressable>
            </View>
            <PillButton
              variant="primary"
              label="招待リンクを共有"
              onPress={handleShareInvite}
              elevated={false}
              icon={<PaperPlaneTiltIcon size={24} color={colors.white} />}
            />
          </Card>

          <View style={styles.spacer} />

          <Pressable
            onPress={handleLeaveTeam}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Text style={styles.leaveText}>チームを退出する</Text>
          </Pressable>
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

  // 招待
  inviteCard: {
    alignItems: "center",
  },
  inviteLabel: {
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    color: colors.textTertiary,
  },
  codeBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
  },
  code: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
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
});
