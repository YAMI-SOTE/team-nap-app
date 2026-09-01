import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useJoinTeam } from "@/hooks/useJoinTeam";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import PillButton from "@/components/PillButton";

/**
 * "チームに参加" (Figma "S04-08_Team_Join", node 306:1565). On success the
 * user is in the team — return to the Team tab.
 */
export default function JoinTeamScreen() {
  const router = useRouter();
  const { code, setCode, isSubmitting, errorMessage, submit } = useJoinTeam();

  const handleSubmit = async () => {
    const team = await submit();
    if (team) {
      router.replace("/team");
    }
  };

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader title="チームに参加" onBack={() => router.back()} />

            <View style={styles.head}>
              <Text style={styles.title}>招待コードを入力</Text>
              <Text style={styles.subtitle}>
                チームのメンバーから共有されたコードを入力してください。
              </Text>
            </View>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={setCode}
              placeholder="NAP-4821"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={12}
              editable={!isSubmitting}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="招待コード"
            />

            <Text style={styles.helper}>コードは英数字8文字です</Text>

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}

            <View style={styles.spacer} />

            <PillButton
              variant="primary"
              label="参加する"
              elevated={false}
              loading={isSubmitting}
              onPress={handleSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  head: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  codeInput: {
    width: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderBrand,
    borderRadius: 16,
    paddingVertical: 16,
    minHeight: 60,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  helper: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.textTertiary,
    textAlign: "center",
  },
  error: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});
