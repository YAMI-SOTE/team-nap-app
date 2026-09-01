import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import PillButton from "@/components/PillButton";
import { InfoIcon } from "@/components/icons";

/**
 * Full-screen "can't reach the server" state (Figma S07-02_Network_Error).
 * Render this from a screen when a load fails with `isConnectionError`.
 */
export default function ConnectionErrorView({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <InfoIcon size={38} color={colors.textTertiary} />
          </View>
          <Text style={styles.title}>接続できません</Text>
          <Text style={styles.body}>
            ネットワークの状態を確認して、{"\n"}もう一度お試しください。
          </Text>
          <View style={styles.buttonWrap}>
            <PillButton
              variant="primary"
              label="再読み込み"
              elevated={false}
              onPress={onRetry}
            />
          </View>
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
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSunken,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  buttonWrap: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
  },
});
