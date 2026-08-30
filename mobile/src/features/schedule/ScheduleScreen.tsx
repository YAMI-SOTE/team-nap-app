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
import { useSchedule } from "@/hooks/useSchedule";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Logo from "@/components/Logo";
import DatePicker from "@/components/DatePicker";
import TaskCard from "@/components/TaskCard";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import {
  AlarmBadgeIcon,
  CalendarIcon,
  ClockUserBadgeIcon,
  MoonStarsIcon,
  NotePencilIcon,
} from "@/components/icons";

export default function ScheduleScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { data, loading, error } = useSchedule(selectedDate);

  const logTodo = (message: string) => () => console.log(`TODO: ${message}`);

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

          <DatePicker
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            eventCounts={data?.weekEventCounts ?? {}}
            napDays={data?.weekNapDays ?? []}
          />

          {data?.freeSlot ? (
            <TaskCard
              icon={<ClockUserBadgeIcon size={41} />}
              time={`${data.freeSlot.start} 〜 ${data.freeSlot.end}`}
              subtitle={data.freeSlot.note}
              footer={
                <PillButton
                  variant="primary"
                  label="この時間に仮眠を提案"
                  elevated={false}
                  icon={<MoonStarsIcon size={24} color={colors.white} />}
                  onPress={logTodo("suggest a nap for this slot")}
                />
              }
            />
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日の予定</Text>
            {(data?.tasks ?? []).map((task) => (
              <TaskCard
                key={task.id}
                icon={<AlarmBadgeIcon size={41} />}
                time={`${task.start}〜${task.end}`}
                subtitle={task.title}
                showCaret
                onPress={() =>
                  router.push({
                    pathname: "/schedule/event",
                    params: { id: task.id },
                  })
                }
              />
            ))}
          </View>

          <View style={styles.actions}>
            <PillButton
              variant="outline"
              label="カレンダー連携"
              icon={<CalendarIcon size={20} color={colors.textBrand} />}
              textStyle={styles.actionText}
              style={styles.actionButton}
              onPress={() => router.push("/settings/calendar")}
            />
            <PillButton
              variant="outline"
              label="予定を追加"
              icon={<NotePencilIcon size={20} color={colors.textBrand} />}
              textStyle={styles.actionText}
              style={styles.actionButton}
              onPress={() => router.push("/schedule/event")}
            />
          </View>

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
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
    paddingBottom: 16,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
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
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 47,
    minHeight: 47,
  },
  actionText: {
    fontSize: 14,
  },
  footer: {
    minHeight: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
});
