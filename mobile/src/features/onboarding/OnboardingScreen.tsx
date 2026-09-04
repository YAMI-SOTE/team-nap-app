import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useAuth } from "@/features/auth/AuthContext";
import { completeOnboarding } from "@/services/authApi";
import { isConnectionError } from "@/services/api";
import { type AvatarId } from "@/constants/avatars";
import AvatarPicker from "@/components/AvatarPicker";
import ConfirmDialog from "@/components/ConfirmDialog";
import PillButton from "@/components/PillButton";
import { BellIcon, CalendarIcon, CaretDownIcon } from "@/components/icons";

/**
 * オンボーディング（Figma S01-03〜S01-06）。
 *
 * Figma のフレームは 402x874。座標をそのまま持ち、描画時に端末幅で
 * スケール（S = width / 402）して配置する。縦はイラスト領域の高さ比
 * （スライドごとに違う）でシート上端を決める。
 *
 * 重要: シートは画面下端まで伸ばす。SafeArea の下インセットを外側で引くと、
 * その分だけシートと猫が上にせり上がって Figma とズレる。インセットは
 * シートの paddingBottom として内側で吸収する。
 */

/** Figma のフレーム寸法。すべての座標はこの座標系。 */
const FRAME_W = 402;
const FRAME_H = 874;

type Bubble = {
  text: string;
  /** Figma 上の吹き出し左上と大きさ。 */
  x: number;
  y: number;
  width: number;
  /** 傾き(deg)。 */
  rotate: number;
  /** しっぽの位置（吹き出し左上からの相対）。 */
  tailLeft: number;
  tailTop: number;
};

type Slide = {
  key: string;
  background: ImageSourcePropType;
  cat: ImageSourcePropType;
  /** Illustration の高さ（Figma）。シート上端 = この値。 */
  illustrationHeight: number;
  /** 猫の Figma 座標。 */
  catX: number;
  catY: number;
  catSize: number;
  /** 猫をシートより手前に描くか（Figma のレイヤー順）。 */
  catAboveSheet?: boolean;
  bubble: Bubble;
  title: string;
  body: string;
  /** Intro だけ本文の下にブランド色の一文が入る。 */
  lead?: string;
  primaryLabel: string;
  primaryIcon?: ReactNode;
  showSkip: boolean;
};

const SLIDES: Slide[] = [
  {
    key: "why-nap",
    background: require("../../../assets/onboarding/scenes/bg-intro.png"),
    cat: require("../../../assets/onboarding/scenes/cat-intro.png"),
    illustrationHeight: 555,
    catX: 36,
    catY: 267,
    catSize: 330,
    bubble: {
      text: "ねむい…でも\n言い出しにくい",
      x: 242,
      y: 216,
      width: 119,
      rotate: -2,
      tailLeft: 10,
      tailTop: 50,
    },
    title: "仕事中って休みにくいよね",
    body: "休みたいけど...\n自分だけ寝るのも、ちょっと気まずい。",
    lead: "TEAM NAPは、\nみんなで休みやすい時間を見つけます。",
    primaryLabel: "つぎへ",
    showSkip: false,
  },
  {
    // 上流 PR #35 で追加されたアバター選択ステップ。Figma に対応フレームが
    // 無いため、Intro のシーンを流用している。
    //
    // ただしアバター選択の分だけシートが高い（イラスト領域 470 に対して
    // Intro は 555）。Intro の座標をそのまま使うと猫がシート上端より 105
    // も下に食い込み、`catAboveSheet` と相まって見出しを覆い隠していた。
    // シーン全体（猫と吹き出し）を、縮んだ分と同じ 85 だけ上へ平行移動して
    // Intro の構図を保つ: 猫の見える下端 490 < 見出し上端 502。
    key: "avatar",
    background: require("../../../assets/onboarding/scenes/bg-intro.png"),
    cat: require("../../../assets/onboarding/scenes/cat-intro.png"),
    illustrationHeight: 470,
    catX: 36,
    catY: 182, // Intro の 267 から -85
    catSize: 330,
    catAboveSheet: true,
    bubble: {
      text: "きみのアイコン、\nどれにする？",
      x: 242,
      y: 131, // 猫と同じだけ上へ（Intro の 216 から -85）
      width: 119,
      rotate: -2,
      tailLeft: 10,
      tailTop: 50,
    },
    title: "アイコンを選ぼう",
    body: "チームのみんなに表示されるよ。\nあとで設定から変えられます。",
    primaryLabel: "つぎへ",
    showSkip: false,
  },
  {
    key: "sleep-rhythm",
    background: require("../../../assets/onboarding/scenes/bg-sleep.png"),
    cat: require("../../../assets/onboarding/scenes/cat-sleep.png"),
    illustrationHeight: 470,
    catX: 41,
    catY: 226,
    catSize: 320,
    // Figma では猫が Content の最後（＝シートより手前）に置かれている。
    catAboveSheet: true,
    bubble: {
      text: "いつも何時に\n寝てるにゃ？",
      x: 50,
      y: 219,
      width: 106,
      rotate: 2,
      tailLeft: 85,
      tailTop: 52,
    },
    title: "あなたの睡眠リズムを\n教えてください",
    body: "夜の睡眠を邪魔しないように、\nいつ寝ているか教えてね。",
    primaryLabel: "つぎへ",
    showSkip: true,
  },
  {
    key: "calendar",
    background: require("../../../assets/onboarding/scenes/bg-calendar.png"),
    cat: require("../../../assets/onboarding/scenes/cat-calendar.png"),
    illustrationHeight: 551,
    catX: 36,
    catY: 261,
    catSize: 330,
    bubble: {
      text: "14:30、\nみんな空いてる！",
      x: 31,
      y: 250,
      width: 132,
      rotate: 2,
      tailLeft: 109,
      tailTop: 53,
    },
    title: "チームの“休める瞬間”を\n探そう！",
    body: "カレンダーを連携すると、\nみんなが休める時間を見つけられます。",
    primaryLabel: "カレンダーを連携する",
    primaryIcon: <CalendarIcon size={24} color={colors.white} />,
    showSkip: true,
  },
  {
    key: "notification",
    background: require("../../../assets/onboarding/scenes/bg-notification.png"),
    cat: require("../../../assets/onboarding/scenes/cat-notification.png"),
    illustrationHeight: 585,
    catX: 36,
    catY: 255,
    catSize: 330,
    bubble: {
      text: "そろそろ\n休憩の時間だよ",
      x: 242,
      y: 232,
      width: 119,
      rotate: -2,
      tailLeft: 10,
      tailTop: 52,
    },
    title: "通知をオンにしよう！",
    body: "仮眠が終わる時間や\nチームからの仮眠提案をお知らせします。",
    primaryLabel: "通知をオンにする",
    primaryIcon: <BellIcon size={24} color={colors.white} />,
    showSkip: true,
  },
];

/** "07時30分" → "07:30"（API へ渡す形式）。 */
function toClock(label: string): string {
  return label.replace("時", ":").replace("分", "");
}

// 起床時間・就寝時間の選択肢。
// TODO: components に共通のピッカー部品があれば、そちらに差し替える。
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}時${minute}分`;
});

export default function OnboardingScreen() {
  const router = useRouter();
  const { status, refresh } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [wakeTime, setWakeTime] = useState("07時30分");
  const [sleepTime, setSleepTime] = useState("23時30分");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [calendarPromptOpen, setCalendarPromptOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  // 実際に描画された枠を onLayout で測る。Dimensions.get('window') は Web で
  // 実際の表示サイズとズレることがあるため、測れたらそちらを正とする。
  //
  // ただし **初期値はウィンドウ寸法にしておく**。スライドは `size.width` が 0 の
  // 間 1 枚も描画されないので、onLayout が来るまでこの画面は完全な白紙になる。
  // 実際 Web ビルドではレイアウトイベントが届かず、オンボーディングが最後まで
  // 何も表示されないケースを確認した（Home など onLayout に依存しない画面は
  // 正常に描画される）。ウィンドウ寸法なら初回描画から実寸に十分近く、
  // onLayout が来ればそこで上書きされる。
  const windowSize = useWindowDimensions();
  const [measured, setMeasured] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const size = measured ?? {
    width: windowSize.width,
    height: windowSize.height,
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (
      width > 0 &&
      height > 0 &&
      (width !== size.width || height !== size.height)
    ) {
      setMeasured({ width, height });
    }
  };

  // オンボーディングはサインアップ後に走る。保存にはセッションが必要。
  useEffect(() => {
    if (status === "signedOut") router.replace("/signup");
  }, [status, router]);

  /**
   * Answers chosen on the *same* tap that finishes onboarding.
   *
   * The last slide's button both records a choice and completes the flow.
   * `setState` does not update the value visible to the current render, so
   * reading the state here saved the value from *before* the tap — the
   * user pressed the notification button and we stored
   * `notificationsEnabled: false`. Since the backend refuses to send a
   * push when that flag is false, every account onboarded this way had
   * push silently disabled.
   */
  type FinalAnswers = Partial<{
    calendarConnected: boolean;
    notificationsEnabled: boolean;
  }>;

  const finishOnboarding = async (answers: FinalAnswers = {}) => {
    if (finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      await completeOnboarding({
        bedtime: toClock(sleepTime),
        wakeTime: toClock(wakeTime),
        calendarConnected: answers.calendarConnected ?? calendarConnected,
        notificationsEnabled:
          answers.notificationsEnabled ?? notificationsEnabled,
        avatar: avatarId,
      });
      await refresh();
      router.replace("/home");
    } catch (error) {
      // Only blame the network when the request actually failed to reach
      // the server. A rejection carries a reason the user can act on —
      // picking 就寝 15:00 with 起床 07:30 is a 16.5h window, which the
      // backend refuses with a message saying exactly that. Showing
      // "check your connection" for it left the user retrying a working
      // network with no way to discover the real problem.
      setFinishError(
        isConnectionError(error)
          ? "設定を保存できませんでした。通信環境をご確認ください。"
          : error instanceof Error && error.message
            ? error.message
            : "設定を保存できませんでした。",
      );
      setFinishing(false);
    }
  };

  const goToIndex = (nextIndex: number, answers: FinalAnswers = {}) => {
    if (nextIndex >= SLIDES.length) {
      void finishOnboarding(answers);
      return;
    }
    scrollRef.current?.scrollTo({ x: nextIndex * size.width, animated: true });
    setIndex(nextIndex);
  };

  const handleMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (size.width === 0) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / size.width));
  };

  const handlePrimaryPress = (slide: Slide) => {
    if (slide.key === "calendar") {
      setCalendarPromptOpen(true);
      return;
    }
    if (slide.key === "notification") {
      // Carry the answer with the navigation: this is the last slide, so
      // the same tap finishes onboarding and the state update would not
      // be visible in time.
      setNotificationsEnabled(true);
      goToIndex(index + 1, { notificationsEnabled: true });
      return;
    }
    goToIndex(index + 1);
  };

  // Figma(402x874) → 実寸のスケール。大きさ・余白はすべてこれを掛ける。
  const s = size.width / FRAME_W;
  const px = (v: number) => v * s;

  // セッション確定前は待つ（サインアウト時は上の useEffect が /signup へ送る）。
  if (status !== "signedIn") {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ConfirmDialog
        visible={calendarPromptOpen}
        title="カレンダーを連携しますか？"
        message="予定を読み取り、チーム全員が空いている時間を見つけやすくなります。あとから設定でも変更できます。"
        confirmLabel="連携する"
        cancelLabel="あとで"
        onConfirm={() => {
          setCalendarConnected(true);
          setCalendarPromptOpen(false);
          // Carried explicitly for the same reason as the notification
          // answer above — correct today because a slide follows, and
          // still correct if the calendar step ever becomes the last one.
          goToIndex(index + 1, { calendarConnected: true });
        }}
        onCancel={() => {
          setCalendarPromptOpen(false);
          goToIndex(index + 1);
        }}
      />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.scroll}
      >
        {size.width === 0
          ? null
          : SLIDES.map((slide, slideIndex) => {
              const illustrationHeight =
                size.height * (slide.illustrationHeight / FRAME_H);
              const sheetHeight = size.height - illustrationHeight;
              // 猫がイラスト下端（＝シート上端）からどれだけはみ出すか。
              const catOverhang =
                slide.catY + slide.catSize - slide.illustrationHeight;
              const bubbleBottom =
                slide.illustrationHeight - (slide.bubble.y + 60);

              const cat = (
                <Image
                  source={slide.cat}
                  style={{
                    position: "absolute",
                    left: px(slide.catX),
                    width: px(slide.catSize),
                    height: px(slide.catSize),
                    bottom: slide.catAboveSheet
                      ? sheetHeight - px(catOverhang)
                      : -px(catOverhang),
                  }}
                  resizeMode="contain"
                  accessible={false}
                />
              );

              return (
                <View key={slide.key} style={{ width: size.width, flex: 1 }}>
                  <Image
                    source={slide.background}
                    style={styles.background}
                    resizeMode="cover"
                    accessible={false}
                  />

                  {/* イラスト領域 — 高さは Figma の比率で固定 */}
                  <View
                    style={[styles.illustration, { height: illustrationHeight }]}
                    pointerEvents="none"
                  >
                    {slide.catAboveSheet ? null : cat}

                    <View
                      style={{
                        position: "absolute",
                        left: px(slide.bubble.x),
                        bottom: px(bubbleBottom),
                        width: px(slide.bubble.width),
                      }}
                    >
                      <View
                        style={[
                          styles.bubbleTail,
                          {
                            left: px(slide.bubble.tailLeft),
                            top: px(slide.bubble.tailTop),
                            width: px(12),
                            height: px(12),
                            borderRadius: px(2),
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.bubble,
                          {
                            height: px(60),
                            borderRadius: px(16),
                            paddingLeft: px(13),
                            paddingTop: px(8),
                            transform: [
                              { rotate: `${slide.bubble.rotate}deg` },
                            ],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bubbleText,
                            { fontSize: px(13), lineHeight: px(21) },
                          ]}
                        >
                          {slide.bubble.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ボトムシート */}
                  <View
                    style={[
                      styles.sheet,
                      {
                        gap: px(16),
                        paddingHorizontal: px(24),
                        paddingTop: px(32),
                        paddingBottom: px(32) + insets.bottom,
                        borderTopLeftRadius: px(32),
                        borderTopRightRadius: px(32),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.title,
                        { fontSize: px(24), lineHeight: px(34) },
                      ]}
                    >
                      {slide.title}
                    </Text>
                    <Text
                      style={[
                        styles.body,
                        { fontSize: px(14), lineHeight: px(24) },
                      ]}
                    >
                      {slide.body}
                    </Text>
                    {slide.lead ? (
                      <Text
                        style={[
                          styles.lead,
                          { fontSize: px(16), lineHeight: px(27) },
                        ]}
                      >
                        {slide.lead}
                      </Text>
                    ) : null}

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
                      <View style={[styles.timeRow, { gap: px(16) }]}>
                        <TimeField
                          label="起床時間"
                          value={wakeTime}
                          options={TIME_OPTIONS}
                          onChange={setWakeTime}
                          px={px}
                        />
                        <TimeField
                          label="就寝時間"
                          value={sleepTime}
                          options={TIME_OPTIONS}
                          onChange={setSleepTime}
                          px={px}
                        />
                      </View>
                    ) : null}

                    <View style={[styles.actions, { gap: px(16) }]}>
                      <View style={[styles.dots, { gap: px(8) }]}>
                        {SLIDES.map((dotSlide, i) => (
                          <View
                            key={dotSlide.key}
                            style={[
                              styles.dot,
                              {
                                width: px(8),
                                height: px(8),
                                borderRadius: px(4),
                              },
                              i === slideIndex && styles.dotActive,
                            ]}
                          />
                        ))}
                      </View>

                      <PillButton
                        variant="primary"
                        label={
                          slideIndex === SLIDES.length - 1
                            ? "はじめる"
                            : slide.primaryLabel
                        }
                        onPress={() => handlePrimaryPress(slide)}
                        icon={slide.primaryIcon}
                        elevated={false}
                        loading={finishing}
                        disabled={finishing}
                        style={{ ...styles.primaryButton, minHeight: px(47) }}
                        textStyle={{ fontSize: px(16), lineHeight: px(27) }}
                      />
                    </View>

                    {finishError ? (
                      <Text
                        style={[
                          styles.skipText,
                          { color: colors.error, fontSize: px(13) },
                        ]}
                      >
                        {finishError}
                      </Text>
                    ) : slide.showSkip ? (
                      <Pressable
                        onPress={() => goToIndex(index + 1)}
                        hitSlop={8}
                        disabled={finishing}
                      >
                        <Text
                          style={[
                            styles.skipText,
                            { fontSize: px(14), lineHeight: px(24) },
                          ]}
                        >
                          あとで設定する
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {slide.catAboveSheet ? cat : null}
                </View>
              );
            })}
      </ScrollView>
    </View>
  );
}

type TimeFieldProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  px: (v: number) => number;
};

// 簡易的な時刻選択。選択肢を順送りするだけの自己完結コンポーネント。
// TODO: チーム共通のピッカー部品が見つかったら差し替える。
function TimeField({ label, value, options, onChange, px }: TimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View
      style={[styles.timeField, { gap: px(4) }, isOpen && { zIndex: 30 }]}
    >
      <Text
        style={[styles.timeLabel, { fontSize: px(14), lineHeight: px(24) }]}
      >
        {label}
      </Text>
      <Pressable
        style={[
          styles.timeInput,
          {
            borderRadius: px(4),
            paddingHorizontal: px(8),
            paddingVertical: px(4),
          },
        ]}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <Text
          style={[styles.timeValue, { fontSize: px(16), lineHeight: px(27) }]}
        >
          {value}
        </Text>
        <CaretDownIcon size={px(24)} />
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  illustration: {
    width: "100%",
  },
  bubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#C4EAE9", // Figma Bubble の枠線
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleTail: {
    position: "absolute",
    backgroundColor: colors.surface,
    transform: [{ rotate: "45deg" }],
  },
  bubbleText: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  sheet: {
    width: "100%",
    // イラストの残りをすべて占める（Figma のシートは画面下端まで伸びる）。
    flexGrow: 1,
    flexShrink: 0,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  title: {
    width: "100%",
    fontWeight: "700",
    color: colors.textBrand,
    textAlign: "center",
  },
  body: {
    width: "100%",
    fontWeight: "500",
    color: colors.textTertiary,
    textAlign: "center",
  },
  lead: {
    width: "100%",
    fontWeight: "700",
    color: colors.textBrand,
    textAlign: "center",
  },
  avatarPickerRow: {
    marginTop: 8,
    alignSelf: "stretch",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    zIndex: 20,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    width: "100%",
    fontWeight: "700",
    color: colors.textPrimary,
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  timeValue: {
    color: colors.textTertiary,
  },
  timeDropdown: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    backgroundColor: colors.surface,
    zIndex: 100,
    elevation: 6,
    shadowColor: "#12292C",
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
  actions: {
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    backgroundColor: colors.borderDefault,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  primaryButton: {
    width: "100%",
  },
  skipText: {
    fontWeight: "700",
    color: colors.textBrand,
  },
});
