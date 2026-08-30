import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { colors } from "@/theme/colors";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import CharacterSlot from "@/components/CharacterSlot";
import Card from "@/components/Card";
import PillButton from "@/components/PillButton";
import { ClipboardTextIcon, PaperPlaneTiltIcon } from "@/components/icons";

/**
 * "チームができました！" — shown right after a team is created
 * (Figma "S04-09_Team_Invite", node 306:1599). The invite code is read
 * back from `GET /settings/team`.
 */
export default function TeamInviteScreen() {
  const router = useRouter();
  const { data, loading } = useTeamSettings();
  const inviteCode = data?.inviteCode ?? "";

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `TEAM NAP に参加しよう！\n招待コード: ${inviteCode}`,
      });
    } catch {
      /* dismissed / unavailable — ignore */
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const goToTeam = () => router.replace("/team");

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <CharacterSlot size={130} />

          <View style={styles.head}>
            <Text style={styles.title}>チームができました！</Text>
            <Text style={styles.body}>
              このコードを共有して、{"\n"}メンバーを招待しましょう。
            </Text>
          </View>

          <Card style={styles.inviteCard}>
            <Text style={[styles.cardLabel, copied && styles.cardLabelCopied]}>
              {copied ? "コピーしました" : "招待コード"}
            </Text>

            <Pressable
              onPress={handleCopy}
              disabled={!inviteCode}
              accessibilityRole="button"
              accessibilityLabel="招待コードをコピー"
              style={styles.codeBox}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.code}>{inviteCode || "----"}</Text>
              )}
              <ClipboardTextIcon size={20} color={colors.textTertiary} />
            </Pressable>

            <PillButton
              variant="primary"
              label="招待リンクを共有"
              elevated={false}
              icon={<PaperPlaneTiltIcon size={24} color={colors.white} />}
              onPress={handleShare}
            />
          </Card>

          <Pressable onPress={goToTeam} accessibilityRole="button" hitSlop={6}>
            <Text style={styles.later}>あとで招待する</Text>
          </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  head: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inviteCard: {
    alignItems: "center",
  },
  cardLabel: {
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    color: colors.textTertiary,
  },
  cardLabelCopied: {
    color: colors.textSuccess,
    fontWeight: "700",
  },
  codeBox: {
    width: "100%",
    minHeight: 34,
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
  later: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textTertiary,
  },
});
