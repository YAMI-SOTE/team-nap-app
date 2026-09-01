import { useState, useEffect, useRef } from "react";
import {
  Image,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme/colors";
import { toClockTime, toISODate } from "@/utils/date";

// 15分（900秒）
const INITIAL_TIME = 15 * 60;
const STROKE_WIDTH = 12;

// Figma（S02-02_Nap_Timer, node 138:695）実測値。
// 402px幅のフレーム基準で、カード312px／リング280px（内側16pxパディング）。
const FIGMA_FRAME_WIDTH = 402;
const FIGMA_CARD_SIZE = 312;
const FIGMA_RING_INSET = 16;

// フレーム背景 #fafafa / カード背景 #f7fafa（--tn-bg-canvas）。
const SCREEN_BG = "#FAFAFA";
const CARD_BG = "#F7FAFA";

export default function RestScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTimeLeftRef = useRef(INITIAL_TIME);

  const buildNapWindow = (elapsedSeconds: number) => {
    const minutes = Math.round(elapsedSeconds / 60);
    const now = new Date();
    const startedAt = new Date(now.getTime() - elapsedSeconds * 1000);
    return {
      minutes,
      date: toISODate(now),
      start: toClockTime(startedAt),
      end: toClockTime(now),
    };
  };

  // The nap is recorded on the rating screen (with the wake / focus
  // rating), which then opens the ふりかえり screen with the AI advice.
  const goToRating = (elapsedSeconds: number) => {
    const { minutes, start, end } = buildNapWindow(elapsedSeconds);
    router.replace({
      pathname: "/naps/rating",
      params: { minutes: String(minutes), start, end },
    });
  };

  // When the countdown reaches zero on its own, go to the rating screen.
  useEffect(() => {
    const prev = prevTimeLeftRef.current;
    prevTimeLeftRef.current = timeLeft;
    if (timeLeft === 0 && prev > 0 && prev <= 2) {
      goToRating(INITIAL_TIME);
    }
  }, [timeLeft]);

  // 実際に描画された画面幅を onLayout で測定する。
  // Dimensions.get('window') はWeb環境で実際の表示幅とズレることがあるため、
  // 見た目のコンテナ幅と必ず一致するこちらを正として使う。
  const [screenWidth, setScreenWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const measuredWidth = e.nativeEvent.layout.width;
    if (measuredWidth > 0 && measuredWidth !== screenWidth) {
      setScreenWidth(measuredWidth);
    }
  };

  // Figmaのフレーム幅(402px)に対する比率で、実画面幅にスケーリングする。
  // カードは画面幅の 78% 前後（312 / 402）に収まるよう上限も設ける。
  const scale = screenWidth > 0 ? Math.min(screenWidth / FIGMA_FRAME_WIDTH, 1.1) : 0;
  const CARD_SIZE = FIGMA_CARD_SIZE * scale;
  const TIMER_SIZE = CARD_SIZE - FIGMA_RING_INSET * 2 * scale;
  const RADIUS = Math.max((TIMER_SIZE - STROKE_WIDTH) / 2, 0);
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Clock time the timer will reach 0 → shown in the speech bubble.
  const wakeAt = toClockTime(new Date(Date.now() + timeLeft * 1000));

  const progress = timeLeft / INITIAL_TIME;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const handleStartPause = () => {
    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(INITIAL_TIME);
    prevTimeLeftRef.current = INITIAL_TIME;
  };

  const handleEnd = () => {
    setIsActive(false);
    const elapsedSeconds = INITIAL_TIME - timeLeft;
    setTimeLeft(0);
    goToRating(elapsedSeconds);
  };

  const playPauseLabel = isActive
    ? "一時停止"
    : timeLeft === INITIAL_TIME
    ? "開始"
    : "再開";

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* NavigationBar */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.mainTitle}>仮眠中</Text>
          <View style={styles.headerSpacer} />
        </View>

        {CARD_SIZE > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Illustration — 眠る猫 ＋ 起床時刻の吹き出し（しっぽ付き） */}
            <View style={styles.illustration}>
              <Image
                source={require("../../../assets/characters/sleeping-cat.png")}
                style={styles.illustrationImage}
                resizeMode="contain"
              />
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>
                  ゆっくり休んでね{"\n"}
                  {wakeAt} に起こすよ
                </Text>
                <View style={styles.bubbleTail} />
              </View>
            </View>

            {/* タイマー円（背景に浮かぶ独立した白い丸カード） */}
            <View
              style={[
                styles.timerCard,
                { width: CARD_SIZE, height: CARD_SIZE, borderRadius: CARD_SIZE / 2 },
              ]}
            >
              <Svg
                width={TIMER_SIZE}
                height={TIMER_SIZE}
                style={[styles.svgContainer, styles.svgRotated]}
              >
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={colors.borderSubtle}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                />
                <Circle
                  cx={TIMER_SIZE / 2}
                  cy={TIMER_SIZE / 2}
                  r={RADIUS}
                  stroke={colors.borderBrand}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </Svg>

              <View style={styles.timeTextContainer}>
                <Text style={styles.labelRemaining}>残り</Text>
                <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
              </View>
            </View>

            {/* 操作ボタン（それぞれ独立した丸ボタン。カードには入っていない） */}
            <View style={styles.buttonSection}>
              <Pressable style={styles.buttonContainer} onPress={handleEnd} testID="timer-end-button">
                <View style={styles.iconButton}>
                  <MaterialCommunityIcons name="stop" size={28} color={colors.textPrimary} />
                </View>
                <Text style={styles.buttonLabel}>終了</Text>
              </Pressable>

              <Pressable
                style={styles.buttonContainer}
                onPress={handleStartPause}
                testID="timer-play-pause-button"
              >
                <View style={[styles.iconButton, styles.playPauseButton]}>
                  <Ionicons
                    name={isActive ? "pause" : "play"}
                    size={32}
                    color={colors.white}
                    style={isActive ? {} : { marginLeft: 3 }}
                  />
                </View>
                <Text style={styles.buttonLabel}>{playPauseLabel}</Text>
              </Pressable>

              <Pressable style={styles.buttonContainer} onPress={handleReset} testID="timer-reset-button">
                <View style={styles.iconButton}>
                  <Ionicons name="refresh-outline" size={28} color={colors.textPrimary} />
                </View>
                <Text style={styles.buttonLabel}>最初から</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerSpacer: {
    width: 24,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  body: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  illustration: {
    width: "100%",
    height: 200,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationImage: {
    width: 224,
    height: 192,
  },
  bubble: {
    position: "absolute",
    top: 0,
    right: 0,
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
    left: 22,
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
  timerCard: {
    marginTop: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CARD_BG,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 6,
  },
  svgContainer: {
    position: "absolute",
  },
  svgRotated: {
    transform: [{ rotate: "-90deg" }],
  },
  timeTextContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  labelRemaining: {
    fontSize: 20,
    fontWeight: "300",
    color: colors.textTertiary,
  },
  timeText: {
    fontSize: 64,
    fontWeight: "400",
    color: colors.textTertiary,
    fontVariant: ["tabular-nums"],
  },
  buttonSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 32,
    marginTop: 40,
  },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderDefault,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  playPauseButton: {
    backgroundColor: colors.borderBrand,
    borderColor: colors.borderBrand,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  buttonLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "400",
  },
});
