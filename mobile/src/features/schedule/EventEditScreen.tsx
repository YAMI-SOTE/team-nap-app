import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useEventEditor } from "@/hooks/useEventEditor";
import { formatJaDate, fromISODate, toISODate } from "@/utils/date";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import LabeledInput from "@/components/LabeledInput";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import FieldRow from "@/components/FieldRow";
import SettingsRow from "@/components/SettingsRow";
import Toggle from "@/components/Toggle";
import PillButton from "@/components/PillButton";
import TimePickerModal from "@/components/TimePickerModal";
import DatePickerModal from "@/components/DatePickerModal";

type PickerTarget = "date" | "start" | "end";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export default function EventEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { initial, loading, saving, error, save, remove, isEdit } =
    useEventEditor(id);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date());
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [allDay, setAllDay] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  useEffect(() => {
    if (!initial) {
      return;
    }
    setTitle(initial.title);
    setDate(fromISODate(initial.date));
    setStart(initial.start);
    setEnd(initial.end);
    setAllDay(initial.allDay);
  }, [initial]);

  const timesInvalid = !allDay && toMinutes(start) >= toMinutes(end);

  const handleSave = async () => {
    if (timesInvalid) {
      return;
    }
    const ok = await save({
      title,
      date: toISODate(date),
      start,
      end,
      allDay,
    });
    if (ok) {
      router.back();
    }
  };

  const handleDelete = async () => {
    const ok = await remove();
    if (ok) {
      router.back();
    }
  };

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={isEdit ? "予定を編集" : "予定を追加"}
            onBack={() => router.back()}
          />

          <LabeledInput
            label="予定名"
            placeholder="例：定例ミーティング"
            value={title}
            onChangeText={setTitle}
          />

          <Card style={styles.card}>
            <FieldRow
              label="日付"
              value={formatJaDate(date)}
              onPress={() => setPicker("date")}
            />
            <Hairline />
            <FieldRow
              label="開始"
              value={allDay ? "終日" : start}
              onPress={allDay ? undefined : () => setPicker("start")}
            />
            <Hairline />
            <FieldRow
              label="終了"
              value={allDay ? "終日" : end}
              onPress={allDay ? undefined : () => setPicker("end")}
            />
          </Card>

          <SettingsRow
            label="終日"
            trailing={<Toggle value={allDay} onValueChange={setAllDay} />}
          />

          {timesInvalid ? (
            <Text style={styles.validationText}>
              終了は開始より後に設定してください。
            </Text>
          ) : null}

          <View style={styles.spacer} />

          <PillButton
            variant="primary"
            label="保存する"
            elevated={false}
            onPress={handleSave}
            loading={saving}
            disabled={timesInvalid}
          />

          {isEdit ? (
            <Pressable
              onPress={handleDelete}
              accessibilityRole="button"
              hitSlop={6}
            >
              <Text style={styles.deleteText}>この予定を削除</Text>
            </Pressable>
          ) : null}

          <View style={styles.footer}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </SafeAreaView>

      <DatePickerModal
        visible={picker === "date"}
        value={date}
        title="日付"
        onCancel={() => setPicker(null)}
        onConfirm={(next) => {
          setPicker(null);
          setDate(next);
        }}
      />
      <TimePickerModal
        visible={picker === "start"}
        value={start}
        title="開始"
        onCancel={() => setPicker(null)}
        onConfirm={(next) => {
          setPicker(null);
          setStart(next);
        }}
      />
      <TimePickerModal
        visible={picker === "end"}
        value={end}
        title="終了"
        onCancel={() => setPicker(null)}
        onConfirm={(next) => {
          setPicker(null);
          setEnd(next);
        }}
      />
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
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    paddingVertical: 4,
    gap: 0,
  },
  validationText: {
    marginTop: -6,
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  deleteText: {
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    color: colors.textDanger,
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
