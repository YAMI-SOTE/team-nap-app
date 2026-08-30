import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useCreateTeam } from "@/hooks/useCreateTeam";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import LabeledInput from "@/components/LabeledInput";
import PillButton from "@/components/PillButton";
import { InfoIcon } from "@/components/icons";

/**
 * "チームをつくる" (Figma "S04-07_Team_Create", node 306:1525). On success
 * the backend has issued an invite code — go to the invite screen.
 */
export default function CreateTeamScreen() {
  const router = useRouter();
  const { name, setName, isSubmitting, errorMessage, submit } = useCreateTeam();

  const handleSubmit = async () => {
    const team = await submit();
    if (team) {
      router.replace("/team/invite");
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
            <ScreenHeader title="チームをつくる" onBack={() => router.back()} />

            <View style={styles.head}>
              <Text style={styles.title}>チームの名前を決めましょう</Text>
              <Text style={styles.subtitle}>あとから変更できます。</Text>
            </View>

            <LabeledInput
              label="チーム名"
              placeholder="例：開発チーム"
              value={name}
              onChangeText={setName}
              editable={!isSubmitting}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <View style={styles.note}>
              <InfoIcon size={18} color={colors.borderBrand} />
              <Text style={styles.noteText}>
                作成すると招待コードが発行されます。
              </Text>
            </View>

            {errorMessage ? (
              <Text style={styles.error}>{errorMessage}</Text>
            ) : null}

            <View style={styles.spacer} />

            <PillButton
              variant="primary"
              label="チームをつくる"
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
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.brandSubtle,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: colors.textBrand,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});
