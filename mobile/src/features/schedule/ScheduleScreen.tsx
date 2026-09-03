import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useSchedule } from "@/hooks/useSchedule";
import AppBackground from "@/components/AppBackground";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import EmptyState from "@/components/EmptyState";
import Logo from "@/components/Logo";
import DatePicker from "@/components/DatePicker";
import TaskCard from "@/components/TaskCard";
import PillButton from "@/components/PillButton";
import NotificationBell from "@/components/NotificationBell";
import CalendarLoadingSkeleton from "@/features/schedule/CalendarLoadingSkeleton";
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
  const { data, loading, revalidating, error, connectionError, reload } =
    useSchedule(selectedDate);

  // Native pull spinner state (only for an actual pull gesture).
  const [pulling, setPulling] = useState(false);
  const firstFocus = useRef(true);

  const onPullRefresh = useCallback(async () => {
    setPulling(true);
    try {
      await reload();
    } finally {
      setPulling(false);
    }
  }, [reload]);

  // Re-fetch every time the screen regains focus (e.g. coming back from
  // 予定を追加 / 予定を編集 after creating or deleting an event) — but not
  // on the first mount, which the hook already loads.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void reload();
    }, [reload]),
  );

  if (connectionError) {
    return <ConnectionErrorView onRetry={reload} />;
  }

  // Show the animated calendar loading screen on the first load AND on
  // any revalidation (pull-to-refresh, or returning after a create /
  // delete) so the refreshed list always comes in behind it.
  const showLoading = (loading && !data) || revalidating;
  const tasks = data?.tasks ?? [];
  const isEmpty =
    !showLoading && !error && tasks.length === 0 && !data?.freeSlot;

  // "今日の予定" only for today; other dates read "M月D日の予定".
  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();
  const scheduleHeading = isToday
    ? "今日の予定"
    : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日の予定`;

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* The page itself does not scroll — only the 予定 list below does. */}
        <View style={styles.content}>
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

          <View style={styles.body}>
            {showLoading ? (
              <CalendarLoadingSkeleton />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : isEmpty ? (
              <EmptyState
                image={require("../../../assets/characters/kirakira-refreshed.png")}
                title="予定はありません"
                body="スケジュールが空いています。好きなタイミングで仮眠できます。"
                actionLabel="いま仮眠を開始する"
                onAction={() => router.push("/rest")}
              />
            ) : (
              <>
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
                        onPress={() => router.push("/team")}
                      />
                    }
                  />
                ) : null}

                {tasks.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{scheduleHeading}</Text>
                    {/* Only this list scrolls, and only when it overflows. */}
                    <ScrollView
                      style={styles.taskScroll}
                      contentContainerStyle={styles.taskScrollContent}
                      showsVerticalScrollIndicator={false}
                      refreshControl={
                        <RefreshControl
                          refreshing={pulling}
                          onRefresh={onPullRefresh}
                          tintColor={colors.primary}
                          colors={[colors.primary]}
                        />
                      }
                    >
                      {tasks.map((task) => (
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
                    </ScrollView>
                  </View>
                ) : null}
              </>
            )}
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
    paddingBottom: 16,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 4,
  },
  body: {
    flex: 1,
    gap: 16,
  },
  section: {
    flex: 1,
    width: "100%",
    gap: 8,
  },
  taskScroll: {
    flex: 1,
  },
  taskScrollContent: {
    gap: 8,
    paddingBottom: 8,
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
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
});
