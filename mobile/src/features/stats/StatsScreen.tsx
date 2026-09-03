import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useStats } from "@/hooks/useStats";
import AppBackground from "@/components/AppBackground";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import EmptyState from "@/components/EmptyState";
import Logo from "@/components/Logo";
import SegmentedControl from "@/components/SegmentedControl";
import PersonalStatsView from "@/features/stats/PersonalStatsView";
import TeamStatsView from "@/features/stats/TeamStatsView";
import NotificationBell from "@/components/NotificationBell";
import { MoonStarsIcon } from "@/components/icons";

const TABS = [
  { key: "personal", label: "個人" },
  { key: "team", label: "チーム" },
] as const;

type StatsTab = (typeof TABS)[number]["key"];

export default function StatsScreen() {
  const router = useRouter();
  const { personal, team, hasTeam, loading, error, connectionError, reload } =
    useStats();
  const [tab, setTab] = useState<StatsTab>("personal");

  // Without a team there is no チーム tab — only 個人.
  const activeTab: StatsTab = hasTeam ? tab : "personal";

  if (connectionError) {
    return <ConnectionErrorView onRetry={reload} />;
  }

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Fixed, non-scrolling. */}
        <View
          style={[
            styles.content,
            // Figma: S05-01 の Content は gap 10、S05-02 は gap 8。
            activeTab === "team" && styles.contentTeam,
          ]}
        >
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <NotificationBell size={28} />
          </View>

          {hasTeam ? (
            <SegmentedControl<StatsTab>
              options={TABS}
              value={tab}
              onChange={setTab}
            />
          ) : null}

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : activeTab === "personal" && personal && !personal.hasRecords ? (
            <EmptyState
              image={require("../../../assets/characters/cat-stats-empty.png")}
              title="まだ仮眠の記録がありません"
              body={"15分の仮眠をとると、スコアや\n集中度の変化がここに表示されます。"}
              actionLabel="はじめての仮眠をとる"
              actionIcon={<MoonStarsIcon size={24} color={colors.white} />}
              onAction={() => router.push("/rest")}
            />
          ) : activeTab === "personal" && personal ? (
            <PersonalStatsView
              data={personal}
              onSeeAll={() => router.push("/naps/history")}
              onNapPress={(id) =>
                router.push({
                  pathname: "/naps/reflection",
                  params: { id },
                })
              }
            />
          ) : activeTab === "team" && team ? (
            <TeamStatsView
              data={team}
              onMemberPress={(id) => router.push(`/members/${id}`)}
              onMorePress={() => router.push("/team")}
            />
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
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 10,
  },
  contentTeam: {
    gap: 8,
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
