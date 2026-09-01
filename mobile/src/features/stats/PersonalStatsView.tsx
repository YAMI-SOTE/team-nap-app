import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import Card from "@/components/Card";
import ProgressBar from "@/components/ProgressBar";
import FocusRow from "@/components/FocusRow";
import StatTile from "@/components/StatTile";
import LineChart from "@/components/LineChart";
import TaskCard from "@/components/TaskCard";
import {
  AlarmBadgeIcon,
  CaretRightIcon,
  MoonStarsIcon,
  StarIcon,
  TimerIcon,
} from "@/components/icons";

import type { PersonalStatsResponse } from "@/types/api";

type PersonalStatsViewProps = {
  data: PersonalStatsResponse;
  onSeeAll: () => void;
};

export default function PersonalStatsView({
  data,
  onSeeAll,
}: PersonalStatsViewProps) {
  return (
    <View style={styles.container}>
      {/* 仮眠スコア */}
      <Card style={styles.scoreCard}>
        <View style={styles.rowBetween}>
          <View style={styles.scoreText}>
            <Text style={styles.scoreLabel}>今週の仮眠スコア</Text>
            <View style={styles.numberRow}>
              <Text style={styles.scoreValue}>{data.score}</Text>
              <Text style={styles.scoreMax}>/{data.scoreMax}</Text>
            </View>
          </View>
          <View style={styles.deltaPill}>
            <Text style={styles.deltaText}>{data.scoreDeltaLabel}</Text>
          </View>
        </View>

        <ProgressBar value={data.score} max={data.scoreMax} height={10} />

        <View style={styles.focusWrap}>
          <FocusRow
            label="仮眠前後の集中度"
            before={data.focus.before}
            after={data.focus.after}
            deltaPt={data.focus.deltaPt}
          />
        </View>
      </Card>

      {/* Metrics */}
      <View style={styles.metrics}>
        <StatTile
          icon={<MoonStarsIcon size={20} color={colors.primary} />}
          value={`${data.napCount}`}
          unit="回"
          label="今週の仮眠"
        />
        <StatTile
          icon={<TimerIcon size={20} color={colors.primary} />}
          value={`${data.avgNapMinutes}`}
          unit="分"
          label="平均仮眠時間"
        />
        <StatTile
          icon={<StarIcon size={20} color={colors.primary} />}
          value={`${data.wakeRating}`}
          label="目覚めの良さ"
        />
      </View>

      {/* コンディション */}
      <Card style={styles.chartCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.chartTitle}>今週のコンディション</Text>
          <Text style={styles.chartSub}>仮眠後の集中度</Text>
        </View>
        <LineChart
          values={data.condition.values}
          labels={data.condition.labels}
        />
      </Card>

      {/* 最近の仮眠 */}
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>最近の仮眠</Text>
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>すべて見る</Text>
            <CaretRightIcon size={16} color={colors.textBrand} />
          </Pressable>
        </View>
        {data.recentNaps.map((nap) => (
          <TaskCard
            key={nap.id}
            icon={<AlarmBadgeIcon size={41} />}
            time={nap.time}
            subtitle={nap.detail}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 10,
  },
  rowBetween: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreCard: {
    paddingVertical: 16,
    gap: 10,
  },
  scoreText: {
    gap: 0,
  },
  scoreLabel: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  scoreValue: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  scoreMax: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  deltaPill: {
    backgroundColor: colors.brandSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  deltaText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  focusWrap: {
    paddingTop: 6,
  },
  metrics: {
    flexDirection: "row",
    gap: 10,
  },
  chartCard: {
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  chartTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  chartSub: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  section: {
    width: "100%",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
});
