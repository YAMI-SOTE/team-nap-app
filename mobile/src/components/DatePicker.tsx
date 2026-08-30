import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import { CaretLeftIcon, CaretRightIcon } from "@/components/icons";
import {
  addDays,
  formatJaDate,
  isSameDay,
  startOfWeek,
  WEEKDAYS_JA,
} from "@/utils/date";

/** Dots rendered under a day never exceed this, however many events it has. */
const MAX_DOTS = 3;

type DatePickerProps = {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  /**
   * Day-of-month -> event count for the shown week. Each day renders one
   * dot per event, capped at {@link MAX_DOTS}.
   */
  eventCounts?: Record<number, number>;
  /** Day-of-month numbers (within the shown week) that have a recorded nap. */
  napDays?: number[];
};

/**
 * Date navigation (‹ 2024年6月12日 (水) ›) plus a Sunday-anchored week
 * strip. The selected day gets a brand pill; days with events get up to
 * three dots; days with a recorded nap get a green ring
 * (Figma "DatePicker", node 244:435).
 */
export default function DatePicker({
  selectedDate,
  onChangeDate,
  eventCounts = {},
  napDays = [],
}: DatePickerProps) {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => onChangeDate(addDays(selectedDate, -1))}
          accessibilityRole="button"
          accessibilityLabel="前の日"
          hitSlop={8}
        >
          <CaretLeftIcon size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatJaDate(selectedDate)}</Text>
        <Pressable
          onPress={() => onChangeDate(addDays(selectedDate, 1))}
          accessibilityRole="button"
          accessibilityLabel="次の日"
          hitSlop={8}
        >
          <CaretRightIcon size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const dotCount = Math.min(
            MAX_DOTS,
            eventCounts[day.getDate()] ?? 0,
          );
          const hasNap = napDays.includes(day.getDate());

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onChangeDate(day)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={styles.cell}
            >
              <Text style={styles.weekday}>{WEEKDAYS_JA[day.getDay()]}</Text>
              <View
                style={[
                  styles.date,
                  hasNap && styles.dateNap,
                  selected && styles.dateSelected,
                ]}
              >
                <Text
                  style={[styles.dateText, selected && styles.dateTextSelected]}
                >
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {Array.from({ length: dotCount }, (_, i) => (
                  <View key={i} style={styles.dot} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateLabel: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  week: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cell: {
    width: 38,
    alignItems: "center",
    gap: 4,
  },
  weekday: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  date: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dateSelected: {
    backgroundColor: colors.primary,
  },
  dateNap: {
    borderWidth: 2,
    borderColor: colors.textSuccess,
  },
  dateText: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  dateTextSelected: {
    color: colors.white,
  },
  dotRow: {
    flexDirection: "row",
    height: 5,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
});
