import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import CharacterSlot from "@/components/CharacterSlot";
import PillButton from "@/components/PillButton";
import { UsersThreeIcon } from "@/components/icons";

/**
 * Team tab shown while the user has not joined a team (Figma
 * "S04-06_Team_Empty", node 306:1457). Rendered by `TeamScreen`.
 */
export default function NoTeamScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell />
          </View>

          <View style={styles.main}>
            <CharacterSlot
              size={200}
              source={require("../../../assets/characters/plus-team.png")}
            />

            <View style={styles.head}>
              <Text style={styles.title}>まだチームに参加していません</Text>
              <Text style={styles.body}>
                チームをつくるか、招待コードで参加すると{"\n"}
                みんなの仮眠状況が見えるようになります。
              </Text>
            </View>

            <View style={styles.actions}>
              <PillButton
                variant="primary"
                label="チームをつくる"
                elevated={false}
                icon={<UsersThreeIcon size={24} color={colors.white} />}
                style={styles.primaryButton}
                onPress={() => router.push("/team/create")}
              />
              <PillButton
                variant="outline"
                label="招待コードで参加"
                textStyle={styles.outlineText}
                style={styles.outlineButton}
                onPress={() => router.push("/team/join")}
              />
            </View>
          </View>
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
    // Figma: Content pt63 − ステータスバー 47 ＝ セーフエリア下 16px
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  head: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 18,
    lineHeight: 27,
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
  actions: {
    width: "100%",
    gap: 10,
    paddingTop: 8,
  },
  primaryButton: {
    minHeight: 47,
  },
  outlineButton: {
    height: 47,
    minHeight: 47,
  },
  outlineText: {
    fontSize: 14,
  },
});
