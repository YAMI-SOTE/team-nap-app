import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { colors } from "@/theme/colors";
import { createNap } from "@/services/naps";
import { toClockTime, toISODate } from "@/utils/date";

const { width } = Dimensions.get("window");

// 15分（900秒）
const INITIAL_TIME = 15 * 60;
const TIMER_SIZE = width * 0.75;
const STROKE_WIDTH = 12;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function RestScreen() {
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedRef = useRef(false);
  const prevTimeLeftRef = useRef(INITIAL_TIME);

  /**
   * Record the finished nap. Best-effort: the backend keeps only one nap
   * per day, so a repeat (409) or an offline error is logged, not shown.
   */
  const recordNap = (elapsedSeconds: number) => {
    if (recordedRef.current) return;
    const minutes = Math.round(elapsedSeconds / 60);
    if (minutes < 1) return;

    recordedRef.current = true;
    const now = new Date();
    const startedAt = new Date(now.getTime() - elapsedSeconds * 1000);

    createNap({
      date: toISODate(now),
      start: toClockTime(startedAt),
      end: toClockTime(now),
      minutes,
    }).catch((err) => {
      recordedRef.current = false;
      console.log(
        "nap not recorded (already logged today or offline):",
        err instanceof Error ? err.message : err,
      );
    });
  };

  // Record when the countdown reaches zero on its own (終了 records itself).
  useEffect(() => {
    const prev = prevTimeLeftRef.current;
    prevTimeLeftRef.current = timeLeft;
    if (timeLeft === 0 && prev > 0 && prev <= 2) {
      recordNap(INITIAL_TIME);
    }
  }, [timeLeft]);

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

  const progress = timeLeft / INITIAL_TIME;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const handleStartPause = () => {
    setIsActive((prev) => !prev);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(INITIAL_TIME);
    recordedRef.current = false;
    prevTimeLeftRef.current = INITIAL_TIME;
  };

  const handleEnd = () => {
    setIsActive(false);
    recordNap(INITIAL_TIME - timeLeft);
    setTimeLeft(0);
    // TODO: 終了時に仮眠のサマリー画面へ遷移する処理をここに実装する。
  };

  const playPauseLabel = isActive
    ? "一時停止"
    : timeLeft === INITIAL_TIME
    ? "開始"
    : "再開";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.topSection}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>仮眠中</Text>
        </View>

        {/* TODO: nap-cat.png が assets に用意でき次第、画像を復活させる */}
      </View>

      <View style={styles.timerSection}>
        <View style={styles.timerContainer}>
          <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.svgContainer}>
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke={colors.borderSubtle}
              strokeWidth={STROKE_WIDTH}
              fill={colors.surface}
            />
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke={colors.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
            />
          </Svg>

          <View style={styles.timeTextContainer}>
            <Text style={styles.labelRemaining}>残り</Text>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonSection}>
        <Pressable style={styles.buttonContainer} onPress={handleEnd} testID="timer-end-button">
          <View style={styles.iconButton}>
            <MaterialCommunityIcons name="stop" size={32} color={colors.primary} />
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
              size={36}
              color={colors.white}
              style={isActive ? {} : { marginLeft: 4 }}
            />
          </View>
          <Text style={styles.buttonLabel}>{playPauseLabel}</Text>
        </Pressable>

        <Pressable style={styles.buttonContainer} onPress={handleReset} testID="timer-reset-button">
          <View style={styles.iconButton}>
            <Ionicons name="refresh-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.buttonLabel}>最初から</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mintVeil,
  },
  topSection: {
    flex: 2,
    alignItems: "center",
  },
  header: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textBrand,
    zIndex: 10,
  },
  catImage: {
    width: width * 0.5,
    height: width * 0.5,
    position: "absolute",
    bottom: -TIMER_SIZE / 4,
  },
  timerSection: {
    flex: 3,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  timerContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  svgContainer: {
    position: "absolute",
  },
  timeTextContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  labelRemaining: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 64,
    fontWeight: "200",
    color: colors.textBrand,
    fontVariant: ["tabular-nums"],
  },
  buttonSection: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 10,
  },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  iconButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  playPauseButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  buttonLabel: {
    fontSize: 14,
    color: colors.textBrand,
    fontWeight: "600",
  },
});
