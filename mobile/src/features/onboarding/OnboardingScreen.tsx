import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useAuth } from "@/features/auth/AuthContext";
import { completeOnboarding } from "@/services/authApi";
import { type AvatarId } from "@/constants/avatars";
import AvatarPicker from "@/components/AvatarPicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import PillButton from "@/components/PillButton";

/**
 * Vertical mint→white wash behind the onboarding pages
 * (Figma "Content", from #e5f6f5 via #f9fcfb 62% to white).
 */
function OnboardingBackdrop() {
  return (
    <LinearGradient
      colors={["#E5F6F5", "#F9FCFB", colors.white]}
      locations={[0, 0.62, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** "07時30分" -> "07:30" for the API. */
function toClock(label: string): string {
  return label.replace("時", ":").replace("分", "");
}

type Slide = {
  key: string;
  /** Speech bubble text from the character. */
  bubble: string;
  title: string;
  body: string;
  primaryLabel: string;
  showSkip: boolean;
  illustration: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    key: "why-nap",
    bubble: "ねむい…でも\n言い出しにくい",
    title: "仕事中って休みにくいよね",
    body: "休みたいけど…\n自分だけ寝るのも、ちょっと気まずい。\n\nTEAM NAPは、\nみんなで休みやすい時間を見つけます。",
    primaryLabel: "つぎへ",
    showSkip: false,
    illustration: require("../../../assets/onboarding/teamnap-01.png"),
  },
  {
    key: "avatar",
    bubble: "きみのアイコン、\nどれにする？",
    title: "アイコンを選ぼう",
    body: "チームのみんなに表示されるよ。\nあとで設定から変えられます。",
    primaryLabel: "つぎへ",
    showSkip: false,
    illustration: require("../../../assets/onboarding/teamnap-01.png"),
  },
  {
    key: "sleep-rhythm",
    bubble: "いつも何時に\n寝てるにゃ？",
    title: "あなたの睡眠リズムを\n教えてください",
    body: "夜の睡眠を邪魔しないように、\nいつ寝ているか教えてね。",
    primaryLabel: "つぎへ",
    // Required — the sleep times must be set/confirmed before continuing.
    showSkip: false,
    illustration: require("../../../assets/onboarding/teamnap-02.png"),
  },
  {
    key: "calendar",
    bubble: "14:30、\nみんな空いてる！",
    title: "チームの“休める瞬間”を\n探そう！",
    body: "カレンダーを連携すると、\nみんなが休める時間を見つけられます。",
    primaryLabel: "カレンダーを連携する",
    showSkip: true,
    illustration: require("../../../assets/onboarding/teamnap-04.png"),
  },
  {
    key: "notification",
    bubble: "そろそろ\n休憩の時間だよ",
    title: "通知をオンにしよう！",
    body: "仮眠が終わる時間や\nチームからの仮眠提案をお知らせします。",
    primaryLabel: "通知をオンにする",
    showSkip: true,
    illustration: require("../../../assets/onboarding/teamnap-03.png"),
  },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}時${minute}分`;
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { status, refresh } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [wakeTime, setWakeTime] = useState("07時30分");
  const [sleepTime, setSleepTime] = useState("23時30分");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [calendarPromptOpen, setCalendarPromptOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Onboarding runs *after* sign-up — it needs a session to save.
  useEffect(() => {
    if (status === "signedOut") router.replace("/signup");
  }, [status, router]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== containerWidth) setContainerWidth(w);
  };

  const finishOnboarding = async () => {
    if (finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      await completeOnboarding({
        bedtime: toClock(sleepTime),
        wakeTime: toClock(wakeTime),
        calendarConnected,
        notificationsEnabled,
        avatar: avatarId,
      });
      await refresh();
      router.replace("/home");
    } catch {
      setFinishError("設定を保存できませんでした。通信環境をご確認ください。");
      setFinishing(false);
    }
  };

  const goToIndex = (nextIndex: number) => {
    if (nextIndex >= SLIDES.length) {
      void finishOnboarding();
      return;
    }
    scrollRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: true });
    setIndex(nextIndex);
  };

  const handlePrimaryPress = () => {
    const slide = SLIDES[index];
    if (slide.key === "calendar") {
      setCalendarPromptOpen(true);
      return;
    }
    if (slide.key === "notification") {
      setNotificationsEnabled(true);
    }
    goToIndex(index + 1);
  };

  if (status !== "signedIn") {
    return (
      <View style={[styles.root, styles.centered]}>
        <OnboardingBackdrop />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <OnboardingBackdrop />

      <ConfirmDialog
        visible={calendarPromptOpen}
        title="カレンダーを連携しますか？"
        message="予定を読み取り、チーム全員が空いている時間を見つけやすくなります。あとから設定でも変更できます。"
        confirmLabel="連携する"
        cancelLabel="あとで"
        onConfirm={() => {
          setCalendarConnected(true);
          setCalendarPromptOpen(false);
          goToIndex(index + 1);
        }}
        onCancel={() => {
          setCalendarPromptOpen(false);
          goToIndex(index + 1);
        }}
      />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Illustration area (paged) */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.pager}
        >
          {containerWidth === 0
            ? null
            : SLIDES.map((s) => (
                <View
                  key={s.key}
                  style={[styles.page, { width: containerWidth }]}
                >
                  {/* Central backdrop — soft mint glow + thin ring + a
                      few scattered dots (Figma "Backdrop / glow|ring"). */}
                  <View style={styles.centerpiece}>
                    <View style={styles.glow} />
                    <View style={styles.ring} />
                    <View style={[styles.bgDot, styles.bgDotA]} />
                    <View style={[styles.bgDot, styles.bgDotB]} />
                    <View style={[styles.bgDot, styles.bgDotC]} />
                    <Image
                      source={s.illustration}
                      style={styles.illustrationImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.bubble}>
                    <Text style={styles.bubbleText}>{s.bubble}</Text>
                    <View style={styles.bubbleTail} />
                  </View>
                </View>
              ))}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom card — content follows the current slide */}
      <SafeAreaView edges={["bottom"]} style={styles.cardSafe}>
        <View style={styles.card}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          {slide.key === "avatar" ? (
            <View style={styles.avatarPickerRow}>
              <AvatarPicker
                selected={avatarId}
                onSelect={setAvatarId}
                disabled={finishing}
              />
            </View>
          ) : null}

          {slide.key === "sleep-rhythm" ? (
            <View style={styles.timeRow}>
              <TimeField
                label="起床時間"
                value={wakeTime}
                options={TIME_OPTIONS}
                onChange={setWakeTime}
              />
              <TimeField
                label="就寝時間"
                value={sleepTime}
                options={TIME_OPTIONS}
                onChange={setSleepTime}
              />
            </View>
          ) : null}

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          <PillButton
            label={isLast ? "はじめる" : slide.primaryLabel}
            onPress={handlePrimaryPress}
            variant="primary"
            elevated={false}
            loading={finishing}
            disabled={finishing}
          />

          {finishError ? (
            <Text style={styles.errorText}>{finishError}</Text>
          ) : slide.showSkip ? (
            <Pressable
              onPress={() => goToIndex(index + 1)}
              hitSlop={8}
              disabled={finishing}
            >
              <Text style={styles.skipText}>あとで設定する</Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function TimeField({ label, value, options, onChange }: TimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Pressable
        style={styles.timeInput}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <Text style={styles.timeValue}>{value}</Text>
      </Pressable>
      {isOpen ? (
        <View style={styles.timeDropdown}>
          <ScrollView style={styles.timeDropdownScroll} nestedScrollEnabled>
            {options.map((option) => (
              <Pressable
                key={option}
                style={styles.timeOption}
                onPress={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    option === value && styles.timeOptionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 24,
  },
  centerpiece: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#DDF1EF",
    opacity: 0.7,
  },
  ring: {
    position: "absolute",
    width: 232,
    height: 232,
    borderRadius: 116,
    borderWidth: 1.5,
    borderColor: "rgba(0,156,160,0.18)",
  },
  bgDot: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(0,156,160,0.22)",
  },
  bgDotA: {
    width: 12,
    height: 12,
    top: 8,
    right: 40,
  },
  bgDotB: {
    width: 7,
    height: 7,
    top: 64,
    left: 22,
  },
  bgDotC: {
    width: 9,
    height: 9,
    bottom: 40,
    right: 24,
  },
  illustrationImage: {
    width: 200,
    height: 200,
  },
  bubble: {
    position: "absolute",
    top: 56,
    right: 24,
    maxWidth: 150,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C4EAE9",
    paddingHorizontal: 14,
    paddingVertical: 9,
    transform: [{ rotate: "-2deg" }],
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleTail: {
    position: "absolute",
    left: 20,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#C4EAE9",
    transform: [{ rotate: "45deg" }],
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardSafe: {
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 12,
    alignItems: "center",
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textBrand,
    textAlign: "center",
    lineHeight: 30,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },
  avatarPickerRow: {
    marginTop: 8,
    alignSelf: "stretch",
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
    alignSelf: "stretch",
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  timeValue: {
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "center",
  },
  timeDropdown: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    zIndex: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timeDropdownScroll: {
    maxHeight: 180,
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  timeOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  timeOptionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  skipText: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  skipPlaceholder: {
    height: 18,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    textAlign: "center",
  },
});
