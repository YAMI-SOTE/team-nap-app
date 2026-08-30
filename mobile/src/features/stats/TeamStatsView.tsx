import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import FocusRow from "@/components/FocusRow";
import StatTile from "@/components/StatTile";
import LineChart from "@/components/LineChart";
import RingGauge from "@/components/RingGauge";
import IconPill from "@/components/IconPill";
import MemberRow, { type MemberRowMember } from "@/components/MemberRow";
import {
  InfoIcon,
  MoonStarsIcon,
  SealCheckIcon,
  TimerIcon,
  TrophyIcon,
} from "@/components/icons";

import type { TeamStatsResponse } from "@/types/api";

type TeamStatsViewProps = {
  data: TeamStatsResponse;
  onMemberPress: (id: string) => void;
  onMorePress: () => void;
};

export default function TeamStatsView({
  data,
  onMemberPress,
  onMorePress,
}: TeamStatsViewProps) {
  return (
    <View style={styles.container}>
      {/* チーム達成率 */}
      <Card style={styles.rateCard}>
        <View style={styles.rateTop}>
          <View style={styles.rateText}>
            <View style={styles.titleRow}>
              <Text style={styles.rateTitle}>チーム仮眠達成率</Text>
              <InfoIcon size={16} color={colors.textTertiary} />
            </View>
            <View style={styles.numberRow}>
              <Text style={styles.rateValue}>{data.achievementRate}</Text>
              <Text style={styles.ratePercent}>%</Text>
            </View>
            <View style={styles.subRow}>
              <Text style={styles.subText}>{data.achievedMemberLabel}</Text>
              <View style={styles.deltaPill}>
                <Text style={styles.deltaText}>
                  {data.achievementDeltaLabel}
                </Text>
              </View>
            </View>
          </View>
          <RingGauge value={data.achievementRate} size={76} />
        </View>

        <Hairline />

        <MemberRow
          members={data.achievedMembers as MemberRowMember[]}
          onMemberPress={onMemberPress}
          onMorePress={onMorePress}
        />

        <FocusRow
          label="仮眠後のチーム平均集中度"
          before={data.focus.before}
          after={data.focus.after}
          deltaPt={data.focus.deltaPt}
        />
      </Card>

      {/* Metrics */}
      <View style={styles.metrics}>
        <StatTile
          icon={<MoonStarsIcon size={20} color={colors.primary} />}
          value={`${data.napCount}`}
          unit="回"
          label="チームの仮眠回数"
        />
        <StatTile
          icon={<TimerIcon size={20} color={colors.primary} />}
          value={`${data.avgNapMinutes}`}
          unit="分"
          label="平均仮眠時間"
        />
        <StatTile
          icon={<SealCheckIcon size={20} color={colors.primary} />}
          value={`${data.everyoneNappedDays}`}
          unit="日"
          label="全員が仮眠できた日"
        />
      </View>

      {/* コンディション */}
      <Card style={styles.chartCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.chartTitle}>チームのコンディション</Text>
          <Text style={styles.chartSub}>チーム平均の集中度</Text>
        </View>
        <LineChart
          values={data.condition.values}
          labels={data.condition.labels}
        />
      </Card>

      {/* 今週の達成 */}
      <IconPill
        icon={<TrophyIcon size={22} />}
        backgroundColor={colors.brandSubtle}
        gap={10}
      >
        <Text style={styles.bannerText}>{data.achievementBanner}</Text>
      </IconPill>

      <Text style={styles.disclaimer}>{data.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  rowBetween: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rateCard: {
    paddingVertical: 14,
    gap: 12,
  },
  rateTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rateText: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rateTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  rateValue: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textBrand,
  },
  ratePercent: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textBrand,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subText: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  deltaPill: {
    backgroundColor: colors.brandSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deltaText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textBrand,
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
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textBrand,
  },
  disclaimer: {
    width: "100%",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "center",
    color: colors.textTertiary,
  },
});
