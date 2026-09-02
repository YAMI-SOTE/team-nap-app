import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useSleepSchedule } from "@/hooks/useSleepSchedule";
import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import IconPill from "@/components/IconPill";
import PillButton from "@/components/PillButton";
import TimeField from "@/components/TimeField";
import { InfoIcon, MoonStarsIcon, TimerIcon } from "@/components/icons";

const DEFAULT_BEDTIME = "23:30";
const DEFAULT_WAKE_TIME = "07:30";
const MINUTES_PER_DAY = 24 * 60;
/** Longer than this and the two times were almost certainly entered in the wrong order. */
const MAX_SLEEP_MINUTES = 16 * 60;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Minutes from bedtime to wake time, wrapping past midnight. */
function overnightDurationMinutes(bedtime: string, wakeTime: string): number {
  return ((toMinutes(wakeTime) - toMinutes(bedtime)) % MINUTES_PER_DAY + MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export default function SleepScheduleScreen() {
  const router = useRouter();
  const { data, loading, saving, error, save } = useSleepSchedule();

  const [bedtime, setBedtime] = useState(DEFAULT_BEDTIME);
  const [wakeTime, setWakeTime] = useState(DEFAULT_WAKE_TIME);
  const seeded = useRef(false);

  useEffect(() => {
    if (data && !seeded.current) {
      setBedtime(data.bedtime);
      setWakeTime(data.wakeTime);
      seeded.current = true;
    }
  }, [data]);

  const napCutoffHour = data?.napCutoffHour ?? 15;
  const durationMinutes = overnightDurationMinutes(bedtime, wakeTime);
  const isValid = durationMinutes > 0 && durationMinutes <= MAX_SLEEP_MINUTES;

  const noteText = isValid
    ? `平均の睡眠時間は${formatDuration(durationMinutes)}です。${napCutoffHour}時以降の仮眠は提案しません。`
    : `${napCutoffHour}時以降の仮眠は提案しません。`;

  const handleSave = () => {
    if (!isValid) {
      return;
    }
    void save({ bedtime, wakeTime });
  };

  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            title="睡眠スケジュール"
            onBack={() => router.back()}
          />

          <Text style={styles.description}>
            夜の睡眠を邪魔しないように、仮眠のおすすめ時間を計算します。
          </Text>

          <Card style={styles.timeCard}>
            <TimeField
              icon={<MoonStarsIcon size={20} color={colors.primary} />}
              label="就寝時間"
              value={bedtime}
              onChange={setBedtime}
            />
            <Hairline />
            <TimeField
              icon={<TimerIcon size={20} color={colors.primary} />}
              label="起床時間"
              value={wakeTime}
              onChange={setWakeTime}
            />
          </Card>

          {!isValid ? (
            <Text style={styles.validationText}>
              起床時間は就寝時間より後になるように設定してください。
            </Text>
          ) : null}

          <IconPill
            icon={<InfoIcon size={18} color={colors.borderBrand} />}
            backgroundColor={colors.brandSubtle}
            style={styles.note}
          >
            <Text style={styles.noteText}>{noteText}</Text>
          </IconPill>

          <View style={styles.spacer} />

          <PillButton
            variant="primary"
            label="保存する"
            elevated={false}
            onPress={handleSave}
            loading={saving}
            disabled={!isValid}
          />

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
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  timeCard: {
    paddingVertical: 6,
    gap: 0,
  },
  validationText: {
    marginTop: -8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
  },
  note: {
    borderRadius: 16,
    paddingVertical: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textBrand,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  footer: {
    minHeight: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.error,
    textAlign: "center",
  },
});
