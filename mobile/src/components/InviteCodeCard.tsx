import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";

import { colors } from "@/theme/colors";
import Card from "@/components/Card";
import PillButton from "@/components/PillButton";
import { ClipboardTextIcon, PaperPlaneTiltIcon } from "@/components/icons";

type InviteCodeCardProps = {
  code: string;
  loading?: boolean;
  style?: ViewStyle;
};

/**
 * "招待コード" card: tap the code to copy it (with "コピーしました"
 * feedback), or share it through the OS share sheet. Used on the
 * team-created screen and in チーム設定 so both behave identically.
 */
export default function InviteCodeCard({
  code,
  loading = false,
  style,
}: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    if (!code) return;
    // Deep link into the join screen with the code pre-filled; the code
    // itself is the fallback for anyone without the app.
    const link = Linking.createURL("team/join", { queryParams: { code } });
    try {
      await Share.share({
        message: `TEAM NAP に参加しよう！\n招待コード: ${code}\n${link}`,
      });
    } catch {
      /* dismissed / unavailable — ignore */
    }
  };

  return (
    <Card style={[styles.card, style]}>
      <Text style={[styles.label, copied && styles.labelCopied]}>
        {copied ? "コピーしました" : "招待コード"}
      </Text>

      <Pressable
        onPress={handleCopy}
        disabled={!code}
        accessibilityRole="button"
        accessibilityLabel="招待コードをコピー"
        style={styles.codeBox}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.code}>{code || "----"}</Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
  },
  label: {
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    color: colors.textTertiary,
  },
  labelCopied: {
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
});
