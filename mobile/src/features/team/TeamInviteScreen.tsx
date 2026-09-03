import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import AppBackground from "@/components/AppBackground";
import CharacterSlot from "@/components/CharacterSlot";
import InviteCodeCard from "@/components/InviteCodeCard";

/**
 * "チームができました！" — shown right after a team is created
 * (Figma "S04-09_Team_Invite", node 306:1599). The invite code is read
 * back from `GET /settings/team`.
 */
export default function TeamInviteScreen() {
  const router = useRouter();
  const { data, loading } = useTeamSettings();

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <CharacterSlot
            size={180}
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
    // Figma: Content pt63 − ステータスバー 47 ＝ セーフエリア下 16px
    paddingTop: 16,
    paddingBottom: 24,
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
});
