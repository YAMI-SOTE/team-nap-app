import { Fragment } from "react";
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
import { useTeamRanking } from "@/hooks/useTeamRanking";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import ScoreRow from "@/components/ScoreRow";
import { CrownSimpleIcon } from "@/components/icons";

import type { Rank } from "@/components/RankBadge";

/**
 * 仮眠上手ランキング — members ordered by rest score, with a top-3 podium
 * (Figma "S04-02_Ranking", node 252:519). Reached from the Team screen.
 */
export default function RankingScreen() {
  const router = useRouter();
  const { data, loading, error } = useTeamRanking();

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="仮眠上手ランキング"
            onBack={() => router.back()}
            align="left"
          />

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.emptyText}>ランキングはまだありません</Text>
            </View>
          ) : (
            <>
              {/* 今週の仮眠上手 — podium */}
              <Card style={styles.card}>
                <View style={styles.cardHead}>
                  <CrownSimpleIcon size={20} />
                  <Text style={styles.cardTitle}>今週の仮眠上手</Text>
                </View>

                {top3.map((entry, index) => (
                  <Fragment key={entry.id}>
                    <ScoreRow
                      name={entry.name}
                      status={entry.status}
                      score={entry.score}
                      rank={(index + 1) as Rank}
                    />
                    {index < top3.length - 1 ? <Hairline /> : null}
                  </Fragment>
                ))}

                <Text style={styles.note}>
                  ランキングは競争ではなく、チーム全体で休みやすくするための目安です。
                </Text>
              </Card>

              {/* メンバー（仮眠スコア順） — full list */}
              <Card style={styles.listCard}>
                <View style={styles.listHead}>
                  <Text style={styles.listHeading}>
                    メンバー（仮眠スコア順）
                  </Text>
                  <Text style={styles.count}>{data?.memberCount ?? 0}人</Text>
                </View>

                {entries.map((entry, index) => (
                  <Fragment key={entry.id}>
                    <ScoreRow
                      name={entry.name}
                      status={entry.status}
                      score={entry.score}
                    />
                    {index < entries.length - 1 ? <Hairline /> : null}
                  </Fragment>
                ))}
              </Card>
            </>
          )}
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
    // Figma: Content pt63 − ステータスバー 47 ＝ セーフエリア下 16px。
    // 下は余白なしで、メンバー一覧カードが画面下端まで伸びる。
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    gap: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  listCard: {
    gap: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  note: {
    // Figma: Micro/Medium — 11px / 1.5
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },
  listHeading: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  count: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
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
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textTertiary,
    textAlign: "center",
  },
});
