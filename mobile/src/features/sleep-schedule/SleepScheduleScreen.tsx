import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import Hairline from "@/components/Hairline";
import IconPill from "@/components/IconPill";
import PillButton from "@/components/PillButton";
import SettingsValueRow from "@/components/SettingsValueRow";
import { InfoIcon, MoonStarsIcon, TimerIcon } from "@/components/icons";

// UI-only for now — no time-picker library or sleep-schedule endpoint yet.
// TODO: back with a `useSleepSchedule` hook + a time picker.
const BEDTIME = "23:30";
const WAKE_TIME = "07:30";
const NAP_CUTOFF_HOUR = 15;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function sleepHours(bedtime: string, wake: string): number {
  let mins = toMinutes(wake) - toMinutes(bedtime);
  if (mins <= 0) {
    mins += 24 * 60;
  }
  return Math.round(mins / 60);
}

export default function SleepScheduleScreen() {
  const router = useRouter();

  const noteText = `平均の睡眠時間は${sleepHours(
    BEDTIME,
    WAKE_TIME,
  )}時間です。${NAP_CUTOFF_HOUR}時以降の仮眠は提案しません。`;

  const handleEditBedtime = () => {
    console.log("TODO: open a time picker for 就寝時間");
  };

  const handleEditWake = () => {
    console.log("TODO: open a time picker for 起床時間");
  };

  const handleSave = () => {
    console.log("TODO: persist the sleep schedule");
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
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
            <SettingsValueRow
              icon={<MoonStarsIcon size={20} color={colors.primary} />}
              label="就寝時間"
              value={BEDTIME}
              onPress={handleEditBedtime}
            />
            <Hairline />
            <SettingsValueRow
              icon={<TimerIcon size={20} color={colors.primary} />}
              label="起床時間"
              value={WAKE_TIME}
              onPress={handleEditWake}
            />
          </Card>

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
          />
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
});
