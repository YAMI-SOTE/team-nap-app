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
import { useNapHistory } from "@/hooks/useNapHistory";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import EmptyState from "@/components/EmptyState";
import ScreenHeader from "@/components/ScreenHeader";
import StatSummary from "@/components/StatSummary";
import TaskCard from "@/components/TaskCard";
import { AlarmBadgeIcon } from "@/components/icons";

export default function NapHistoryScreen() {
  const router = useRouter();
  const { data, loading, error } = useNapHistory();

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="仮眠の履歴" onBack={() => router.back()} />

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : data && data.days.length === 0 ? (
            <EmptyState
              image={require("../../../assets/characters/genki.png")}
              title="まだ仮眠の記録がありません"
              body="仮眠を記録すると、ここに履歴が表示されます。"
            />
          ) : data ? (
            <>
              <StatSummary
                items={[
                  {
                    value: `${data.summary.monthlyCount}`,
                    unit: "回",
                    label: "今月の仮眠",
                  },
                  {
                    value: `${data.summary.avgMinutes}`,
                    unit: "分",
                    label: "平均仮眠時間",
                  },
                  {
                    value: `${data.summary.avgWakeRating}`,
                    label: "平均の目覚め",
                  },
                ]}
              />

              {data.days.map((day) => (
                <View key={day.dateLabel} style={styles.dayGroup}>
                  <Text style={styles.dateLabel}>{day.dateLabel}</Text>
                  {day.records.map((record) => (
                    <TaskCard
                      key={record.id}
                      icon={<AlarmBadgeIcon size={41} />}
                      time={record.time}
                      subtitle={record.detail}
                      showCaret
                      onPress={() =>
                        router.push({
                          pathname: "/naps/reflection",
                          params: { id: record.id },
                        })
                      }
                    />
                  ))}
                </View>
              ))}
            </>
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
    gap: 12,
  },
  dayGroup: {
    width: "100%",
    gap: 8,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.error,
    textAlign: "center",
  },
});
