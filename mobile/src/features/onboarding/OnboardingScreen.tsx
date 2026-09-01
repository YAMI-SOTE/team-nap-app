import { useRef, useState } from "react";
import {
  Alert,
  Image,
  type ImageSourcePropType,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useAuth } from "@/features/auth/AuthContext";
import { completeOnboarding } from "@/services/authApi";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import PillButton from "@/components/PillButton";

/** "07時30分" -> "07:30" for the API. */
function toClock(label: string): string {
  return label.replace("時", ":").replace("分", "");
}

type Slide = {
  key: string;
  title: string;
  body: string;
  primaryLabel: string;
  showSkip: boolean;
  illustration: ImageSourcePropType;
};

const SLIDES: Slide[] = [
  {
    key: "why-nap",
    title: "仕事中って休みにくいよね",
    body: "休みたいけど…\n自分だけ寝るのも、ちょっと気まずい。\n\nTEAM NAPは、\nみんなで休みやすい時間を見つけます。",
    primaryLabel: "つぎへ",
    showSkip: false,
    illustration: require("../../../assets/onboarding/teamnap-01.png"),
  },
  {
    key: "sleep-rhythm",
    title: "あなたの睡眠リズムを\n教えてください",
    body: "夜の睡眠を邪魔しないように、\nいつ寝ているか教えてね。",
    primaryLabel: "つぎへ",
    // Required — no skip. The user must set/confirm their sleep times.
    showSkip: false,
    illustration: require("../../../assets/onboarding/teamnap-02.png"),
  },
  {
    key: "calendar",
    title: "チームの“休める瞬間”を\n探そう！",
    body: "カレンダーを連携すると、\nみんなが休める時間を見つけられます。",
    primaryLabel: "カレンダーを連携する",
    showSkip: true,
    illustration: require("../../../assets/onboarding/teamnap-04.png"),
  },
  {
    key: "notification",
    title: "通知をオンにしよう！",
    body: "仮眠が終わる時間や\nチームからの仮眠提案をお知らせします。",
    primaryLabel: "通知をオンにする",
    showSkip: true,
    illustration: require("../../../assets/onboarding/teamnap-03.png"),
  },
];

// 起床時間・就寝時間の選択肢。
// TODO: components に共通のピッカー部品があれば、そちらに差し替える。
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}時${minute}分`;
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [wakeTime, setWakeTime] = useState("07時30分");
  const [sleepTime, setSleepTime] = useState("23時30分");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // 実際に描画された枠の幅を onLayout で測定する。
  // Dimensions.get('window') はWeb環境で実際の表示幅とズレることがあるため、
  // 見た目のコンテナ幅と必ず一致するこちらを正として使う。
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const measuredWidth = e.nativeEvent.layout.width;
    if (measuredWidth > 0 && measuredWidth !== containerWidth) {
      setContainerWidth(measuredWidth);
    }
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
      // Account already exists (onboarding follows signup) — persist the
      // answers and go home.
      void finishOnboarding();
      return;
    }
    scrollRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: true });
    setIndex(nextIndex);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth === 0) return;
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / containerWidth);
    setIndex(nextIndex);
  };

  const handlePrimaryPress = () => {
    const slide = SLIDES[index];
    if (slide.key === "calendar") {
      // Show the "連携しますか？" popup. Connecting is optional — either
      // choice advances to the next slide.
      Alert.alert(
        "カレンダーを連携しますか？",
        "予定を読み取り、チーム全員が空いている時間を見つけやすくなります。連携しなくても続けられます。",
        [
          { text: "あとで", style: "cancel", onPress: () => goToIndex(index + 1) },
          {
            text: "連携する",
            onPress: () => {
              setCalendarConnected(true);
              goToIndex(index + 1);
            },
          },
        ],
      );
      return;
    }
    if (slide.key === "notification") {
      // TODO: expo-notifications 等で実際の許可リクエストを出す。
      setNotificationsEnabled(true);
    }
    goToIndex(index + 1);
  };

  const handleSkip = () => {
    goToIndex(index + 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} onLayout={handleLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.scroll}
      >
        {containerWidth === 0
          ? null
          : SLIDES.map((slide) => (
          <ScrollView
            key={slide.key}
            style={{ width: containerWidth, flex: 1 }}
            contentContainerStyle={styles.slide}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.illustrationWrap}>
              <AuroraBackdrop />
              <Image
                source={slide.illustration}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>

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
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <PillButton
          label={
            index === SLIDES.length - 1 ? "はじめる" : SLIDES[index].primaryLabel
          }
          onPress={handlePrimaryPress}
          variant="primary"
          loading={finishing}
          disabled={finishing}
        />

        {finishError ? (
          <Text style={styles.errorText}>{finishError}</Text>
        ) : SLIDES[index].showSkip ? (
          <Pressable onPress={handleSkip} hitSlop={8} disabled={finishing}>
            <Text style={styles.skipText}>あとで設定する</Text>
          </Pressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>
    </SafeAreaView>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

// 簡易的な時刻選択。選択肢を順送りするだけの自己完結コンポーネント。
// TODO: チーム共通のピッカー部品が見つかったら差し替える。
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  illustrationWrap: {
    height: 200,
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  illustrationImage: {
    width: "70%",
    height: "100%",
  },
  textBlock: {
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 30,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
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
    top: 68,
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
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 16,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
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
