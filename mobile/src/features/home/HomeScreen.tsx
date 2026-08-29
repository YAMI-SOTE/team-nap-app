import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/theme/colors";
import Logo from "@/components/Logo";
import Hairline from "@/components/Hairline";
import ProgressBar from "@/components/ProgressBar";
import CharacterSlot from "@/components/CharacterSlot";
import MemberAvatar, { type MemberStatus } from "@/components/MemberAvatar";
import PillButton from "@/components/PillButton";
import {
  BellIcon,
  DotsThreeCircleIcon,
  MoonStarsIcon,
} from "@/components/icons";

const SCREEN_PADDING = 28;

type Member = {
  id: string;
  label: string;
  status: MemberStatus;
};

// TODO: replace with real data from the backend / a `useHomeSummary` hook.
const TODAY_LABEL = "6月12日 (水)";
const TEAM_HEADLINE = ["今日のチームは", "いい調子です"];
const TEAM_SCORE = 82;
const TEAM_SCORE_MAX = 100;
const AI_ADVICE_PLACEHOLDER = "AIアドバイスを表示する場所";
const MEMBER_STATUS_SUMMARY = "仮眠中 2人 ・ 作業中 3人";
const NEXT_FREE_CONTEXT = "次の空き時間 ・ 次の予定まで30分";
const NEXT_FREE_RANGE = "14:30〜15:00";
const NEXT_FREE_DETAIL = "6人中5人が予定なし";

const MEMBERS: Member[] = [
  { id: "a", label: "A", status: "resting" },
  { id: "b", label: "B", status: "working" },
  { id: "c", label: "C", status: "resting" },
  { id: "d", label: "D", status: "working" },
  { id: "e", label: "E", status: "offline" },
  { id: "f", label: "F", status: "working" },
];

export default function HomeScreen() {
  const router = useRouter();

  const handleOpenNotifications = () => {
    console.log("TODO: open notifications screen");
    // TODO: no notifications screen exists yet.
  };

  const handleSuggestTeamNap = () => {
    console.log("TODO: suggest a nap to everyone");
    // TODO: wire to the "suggest a nap to everyone" backend action.
  };

  return (
    <View style={styles.root}>
      <Aura />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Logo width={68} color={colors.primary} />
            <Pressable
              onPress={handleOpenNotifications}
              accessibilityRole="button"
              accessibilityLabel="通知"
              hitSlop={8}
            >
              <BellIcon size={26} color={colors.primary} showDot />
            </Pressable>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.dateLabel}>{TODAY_LABEL}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroTitle}>{TEAM_HEADLINE.join("\n")}</Text>
              </View>
              <CharacterSlot size={84} />
            </View>
          </View>

          {/* チームの状態 */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.rowBetween}>
              <View style={styles.metricText}>
                <Text style={styles.sectionLabel}>チームの状態</Text>
                <View style={styles.metricNumberRow}>
                  <Text style={styles.metricNumber}>{TEAM_SCORE}</Text>
                  <Text style={styles.metricUnit}>/{TEAM_SCORE_MAX}</Text>
                </View>
              </View>
            </View>
            <ProgressBar value={TEAM_SCORE} max={TEAM_SCORE_MAX} />
            <Text style={styles.sectionLabel}>{AI_ADVICE_PLACEHOLDER}</Text>
          </View>

          {/* メンバー */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>メンバーのようす</Text>
              <Text style={styles.sectionSubLabel}>
                {MEMBER_STATUS_SUMMARY}
              </Text>
            </View>
            <View style={styles.membersRow}>
              {MEMBERS.map((member) => (
                <MemberAvatar
                  key={member.id}
                  label={member.label}
                  status={member.status}
                  onPress={() => router.push(`/members/${member.id}`)}
                />
              ))}
              <Pressable
                onPress={() => router.push("/team")}
                accessibilityRole="button"
                accessibilityLabel="メンバーをもっと見る"
                style={styles.membersMore}
                hitSlop={8}
              >
                <DotsThreeCircleIcon size={40} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 次の空き時間 */}
          <View style={styles.section}>
            <Hairline />
            <View style={styles.nextFreeText}>
              <Text style={styles.sectionLabel}>{NEXT_FREE_CONTEXT}</Text>
              <Text style={styles.nextFreeRange}>{NEXT_FREE_RANGE}</Text>
              <Text style={styles.sectionSubLabel}>{NEXT_FREE_DETAIL}</Text>
            </View>
            <PillButton
              variant="outline"
              label="みんなに仮眠を提案"
              onPress={handleSuggestTeamNap}
              icon={<MoonStarsIcon size={24} color={colors.primary} />}
            />
          </View>

          <View style={styles.spacer} />

          {/* 仮眠を開始 */}
          <PillButton
            variant="primary"
            label="仮眠を開始"
            onPress={() => router.push("/rest")}
            icon={<MoonStarsIcon size={22} color={colors.white} />}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Soft brand-tinted glow behind the hero (Figma "Aura", a 48px blur).
 * Approximated with a radial gradient — react-native-svg blur filters
 * are not reliably supported across platforms.
 */
function Aura() {
  return (
    <Svg style={styles.aura} width={360} height={360} pointerEvents="none">
      <Defs>
        <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.brandSubtle} stopOpacity={0.9} />
          <Stop offset="1" stopColor={colors.brandSubtle} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={180} cy={180} r={180} fill="url(#aura)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  aura: {
    position: "absolute",
    top: -70,
    right: -110,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hero: {
    gap: 10,
    paddingTop: 8,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 45,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  section: {
    gap: 10,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricText: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  sectionSubLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textTertiary,
  },
  metricNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  metricNumber: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -0.32,
    color: colors.textPrimary,
  },
  metricUnit: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  membersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  membersMore: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  nextFreeText: {
    gap: 2,
  },
  nextFreeRange: {
    fontSize: 24,
    lineHeight: 34,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  spacer: {
    flex: 1,
    minHeight: 5,
  },
});
