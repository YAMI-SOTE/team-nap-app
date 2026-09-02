import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { getNap } from "@/services/naps";
import { isConnectionError } from "@/services/api";
import SceneBackground from "@/components/SceneBackground";
import ScreenHeader from "@/components/ScreenHeader";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import PillButton from "@/components/PillButton";
import { HouseIcon, MoonStarsIcon } from "@/components/icons";

import type { NapDetailResponse } from "@/types/api";

/**
 * ふりかえり — shown right after rating a nap, and reachable later from
 * every history row (Figma S02 268:613). Loads the AI advice stored on
 * the nap record.
 */
export default function NapReflectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [data, setData] = useState<NapDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("記録が見つかりません");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setConnectionError(false);
    setError(null);
    getNap(id)
      .then((res) => active && setData(res))
      .catch((err) => {
        if (!active) return;
        if (isConnectionError(err)) setConnectionError(true);
        else setError(err instanceof Error ? err.message : "エラーが発生しました");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const goHome = () => router.replace("/home");

  if (connectionError) {
    return <ConnectionErrorView onRetry={() => router.replace(`/naps/reflection?id=${id ?? ""}`)} />;
  }

  return (
    <SceneBackground
      source={require("../../../assets/backgrounds/nap-day.png")}
      scrim="bottom"
      imageOpacity={1}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScreenHeader title="ふりかえり" onBack={() => router.back()} />

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : data ? (
            <>
              <Image
                source={require("../../../assets/characters/cat-advice.png")}
                style={styles.character}
                resizeMode="contain"
              />
              <View style={styles.heading}>
                <Text style={styles.title}>おつかれさまでした</Text>
                <Text style={styles.subtitle}>{data.summaryLabel}</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <MoonStarsIcon size={18} color={colors.primary} />
                  <Text style={styles.cardHeadText}>AIアドバイス</Text>
                </View>
                <Text style={styles.adviceText}>
                  {data.aiAdvice ?? "アドバイスを準備しています。"}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PillButton
            variant="primary"
            label="ホームに戻る"
            elevated={false}
            icon={<HouseIcon size={24} color={colors.white} />}
            onPress={goHome}
            style={styles.homeButton}
          />
        </View>
      </SafeAreaView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safeArea: { flex: 1 },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  character: {
    width: 200,
    height: 200,
  },
  heading: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 39,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    shadowColor: "#12292C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeadText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textBrand,
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  homeButton: {
    // Figma（node 733:4351）は py10 + 16px/1.7 の1行 = 47px。
    minHeight: 47,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
});
