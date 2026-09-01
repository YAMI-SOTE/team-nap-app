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
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import ConnectionErrorView from "@/components/ConnectionErrorView";
import PillButton from "@/components/PillButton";
import { HouseIcon, InfoIcon } from "@/components/icons";

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
    <View style={styles.root}>
      <AuroraBackdrop />
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
                source={require("../../../assets/characters/kirakira-refreshed.png")}
                style={styles.character}
                resizeMode="contain"
              />
              <Text style={styles.title}>おつかれさまでした</Text>
              <Text style={styles.subtitle}>{data.summaryLabel}</Text>

              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <InfoIcon size={18} color={colors.textBrand} />
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
            icon={<HouseIcon size={20} color={colors.white} />}
            onPress={goHome}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safeArea: { flex: 1 },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  character: {
    width: 150,
    height: 150,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    gap: 10,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardHeadText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textBrand,
  },
  adviceText: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
});
