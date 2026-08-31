import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import Card from "@/components/Card";
import CharacterSlot from "@/components/CharacterSlot";
import PillButton from "@/components/PillButton";
import { StarFillIcon, StarIcon } from "@/components/icons";

const WAKE_STAR_VALUES = [1, 2, 3, 4, 5];
const WAKE_STAR_LABELS: Record<number, string> = {
  1: "あまり眠れなかった",
  2: "少し眠気が残っている",
  3: "まずまずの目覚め",
  4: "すっきり起きられた",
  5: "とてもすっきり起きられた",
};

const FOCUS_LEVELS = [1, 2, 3, 4, 5];

/**
 * Post-nap reflection screen (Figma "S02-03_Nap_Rating", node 300:1121).
 * Shown after 仮眠タイマー (`RestScreen`) ends.
 */
export default function NapRatingScreen() {
  const router = useRouter();
  const { minutes, start, end } = useLocalSearchParams<{
    minutes?: string;
    start?: string;
    end?: string;
  }>();

  const [wakeStars, setWakeStars] = useState(4);
  const [focusLevel, setFocusLevel] = useState(4);

  const summary =
    minutes && start && end ? `${minutes}分の仮眠 ・ ${start}〜${end}` : null;

  const finish = () => {
    // TODO: 目覚め評価(wakeStars)・集中度(focusLevel)を記録するAPIが
    // 用意でき次第、ここでバックエンドに送信する（仮眠自体は
    // RestScreen 側で記録済みのため、ここでは createNap を再呼び出ししない）。
    router.replace("/home");
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <CharacterSlot
            size={150}
            source={require("../../../assets/characters/kirakira-refreshed.png")}
          />

          <View style={styles.heading}>
            <Text style={styles.title}>おつかれさまでした</Text>
            {summary ? <Text style={styles.subtitle}>{summary}</Text> : null}
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>目覚めはどうでしたか？</Text>
            <View style={styles.starsRow}>
              {WAKE_STAR_VALUES.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setWakeStars(value)}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`目覚め ${value}`}
                  testID={`nap-rating-wake-star-${value}`}
                >
                  {value <= wakeStars ? (
                    <StarFillIcon size={34} />
                  ) : (
                    <StarIcon size={34} color={colors.borderSubtle} />
                  )}
                </Pressable>
              ))}
            </View>
            <Text style={styles.starCaption}>{WAKE_STAR_LABELS[wakeStars]}</Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>いまの集中度は？</Text>
            <View style={styles.scaleRow}>
              {FOCUS_LEVELS.map((level) => {
                const active = level === focusLevel;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setFocusLevel(level)}
                    style={[styles.scaleItem, active && styles.scaleItemActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`集中度 ${level}`}
                    testID={`nap-rating-focus-${level}`}
                  >
                    <Text
                      style={[styles.scaleText, active && styles.scaleTextActive]}
                    >
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabelText}>ぼんやり</Text>
              <Text style={styles.scaleLabelText}>冴えている</Text>
            </View>
          </Card>

          <PillButton
            label="記録する"
            onPress={finish}
            style={styles.submitButton}
          />

          <Pressable onPress={finish} hitSlop={8} testID="nap-rating-skip">
            <Text style={styles.skipText}>あとで入力する</Text>
          </Pressable>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  heading: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
  },
  starCaption: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  scaleItem: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSunken,
  },
  scaleItemActive: {
    backgroundColor: colors.primary,
  },
  scaleText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  scaleTextActive: {
    color: colors.white,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  scaleLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  submitButton: {
    width: "100%",
  },
  skipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textTertiary,
    textAlign: "center",
  },
});
