import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useStats } from "@/hooks/useStats";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import SegmentedControl from "@/components/SegmentedControl";
import PersonalStatsView from "@/features/stats/PersonalStatsView";
import TeamStatsView from "@/features/stats/TeamStatsView";
import NotificationBell from "@/components/NotificationBell";

const TABS = [
  { key: "personal", label: "個人" },
  { key: "team", label: "チーム" },
] as const;

type StatsTab = (typeof TABS)[number]["key"];

export default function StatsScreen() {
  const router = useRouter();
  const { personal, team, loading, error } = useStats();
  const [tab, setTab] = useState<StatsTab>("personal");

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell />
          </View>

          <SegmentedControl<StatsTab>
            options={TABS}
            value={tab}
            onChange={setTab}
          />

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : tab === "personal" && personal ? (
            <PersonalStatsView
              data={personal}
              onSeeAll={() => router.push("/naps/history")}
              onNapPress={(id) => console.log(`TODO: open nap ${id}`)}
            />
          ) : tab === "team" && team ? (
            <TeamStatsView
              data={team}
              onMemberPress={(id) => router.push(`/members/${id}`)}
              onMorePress={() => router.push("/team")}
            />
          ) : null}
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
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.error,
    textAlign: "center",
  },
});
