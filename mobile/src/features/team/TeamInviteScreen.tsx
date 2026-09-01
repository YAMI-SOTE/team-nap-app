import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import CharacterSlot from "@/components/CharacterSlot";
import InviteCodeCard from "@/components/InviteCodeCard";
import PillButton from "@/components/PillButton";

/** The "ホームに戻る" button appears this long after the screen mounts. */
const HOME_BUTTON_DELAY_MS = 5000;

/**
 * "チームができました！" — shown right after a team is created
 * (Figma "S04-09_Team_Invite", node 306:1599). The invite code is read
 * back from `GET /settings/team`.
 */
export default function TeamInviteScreen() {
  const router = useRouter();
  const { data, loading } = useTeamSettings();
  const [showHomeButton, setShowHomeButton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setShowHomeButton(true),
      HOME_BUTTON_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <CharacterSlot
            size={130}
            source={require("../../../assets/characters/celebration.png")}
          />

          <View style={styles.head}>
            <Text style={styles.title}>チームができました！</Text>
            <Text style={styles.body}>
              このコードを共有して、{"\n"}メンバーを招待しましょう。
            </Text>
          </View>

          <InviteCodeCard code={data?.inviteCode ?? ""} loading={loading} />

          <Pressable
            onPress={() => router.replace("/team")}
            accessibilityRole="button"
            hitSlop={6}
          >
            <Text style={styles.later}>あとで招待する</Text>
          </Pressable>

          {showHomeButton ? (
            <View style={styles.homeButton}>
              <PillButton
                variant="outline"
                label="ホームに戻る"
                elevated={false}
                onPress={() => router.replace("/home")}
              />
            </View>
          ) : null}
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
  later: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textTertiary,
  },
  homeButton: {
    alignSelf: "stretch",
    marginTop: 8,
  },
});
