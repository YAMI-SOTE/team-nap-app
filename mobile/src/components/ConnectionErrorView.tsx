import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import AppBackground from "@/components/AppBackground";
import PillButton from "@/components/PillButton";
import { ArrowCounterClockwiseIcon, CloudSlashIcon } from "@/components/icons";

/**
 * 通信エラーの全画面表示（Figma S07-02_Network_Error, node 733:5443）。
 * 読み込みが `isConnectionError` で失敗したときに各画面から出す。
 */
export default function ConnectionErrorView({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <CloudSlashIcon size={42} />
          </View>

          <View style={styles.head}>
            <Text style={styles.title}>接続できません</Text>
            <Text style={styles.body}>
              ネットワークの状態を確認して、{"\n"}もう一度お試しください。
            </Text>
          </View>

          <PillButton
            variant="primary"
            label="再読み込み"
            elevated={false}
            onPress={onRetry}
            icon={<ArrowCounterClockwiseIcon size={24} color={colors.white} />}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // Figma: pt63 / pb24 / px24、要素間 16
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.surfaceSunken,
  },
  head: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  title: {
    // Figma: Heading/H3 — 20px / 1.5 / 700
    width: "100%",
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    // Figma: Caption/Regular — 12px / 1.6
    width: "100%",
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: "center",
  },
  button: {
    // Figma: py10 + 16px/1.7 の1行 = 47px
    minHeight: 47,
  },
});
