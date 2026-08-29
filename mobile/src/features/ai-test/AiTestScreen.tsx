import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { config } from "@/constants/config";
import {
  generatePersonalRestComment,
  generateTeamRestComment,
} from "@/services/ai";

import type { PersonalRestData, TeamRestData } from "@/types/ai";

const personalSample: PersonalRestData = {
  sleepHours: 6.5,
  restMinutes: 18,
  restTime: "14:20",
  wakeScore: 4,
  selfInitiated: true,
  restFrequency: 2,
  encouragedOthers: true,
  restDurationEvaluation: "appropriate",
  restTimingEvaluation: "good",
  wakeEvaluation: "good",
  restFrequencyEvaluation: "appropriate",
  selfInitiatedEvaluation: "self",
};

const teamSample: TeamRestData = {
  teamAverageScore: 3.8,
  memberCount: 6,
  averageRestMinutes: 16,
  selfInitiatedRate: 0.67,
  encouragementCount: 4,
  teamRestEvaluation: "good",
  encouragementEvaluation: "active",
};

type RequestState = {
  loading: boolean;
  comment: string;
  error: string;
};

const initialState: RequestState = {
  loading: false,
  comment: "",
  error: "",
};

export function AiTestScreen() {
  const [personalState, setPersonalState] = useState(initialState);
  const [teamState, setTeamState] = useState(initialState);

  async function handlePersonalTest() {
    setPersonalState({
      loading: true,
      comment: "",
      error: "",
    });

    try {
      const comment = await generatePersonalRestComment(personalSample);

      setPersonalState({
        loading: false,
        comment,
        error: "",
      });
    } catch (error) {
      setPersonalState({
        loading: false,
        comment: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  }

  async function handleTeamTest() {
    setTeamState({
      loading: true,
      comment: "",
      error: "",
    });

    try {
      const comment = await generateTeamRestComment(teamSample);

      setTeamState({
        loading: false,
        comment,
        error: "",
      });
    } catch (error) {
      setTeamState({
        loading: false,
        comment: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Test</Text>
        <Text style={styles.subtitle}>
          Use this screen to call the backend AI endpoints with fixed sample
          payloads.
        </Text>
      </View>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>API base URL</Text>
        <Text style={styles.metaValue}>
          {config.apiUrl || "EXPO_PUBLIC_API_URL is not configured"}
        </Text>
      </View>

      <TestCard
        title="Personal Comment"
        description="Sends sample personal rest data to /ai/personal-comment."
        payload={personalSample}
        state={personalState}
        actionLabel={personalState.loading ? "Generating..." : "Run Personal Test"}
        onPress={handlePersonalTest}
      />

      <TestCard
        title="Team Comment"
        description="Sends sample team summary data to /ai/team-comment."
        payload={teamSample}
        state={teamState}
        actionLabel={teamState.loading ? "Generating..." : "Run Team Test"}
        onPress={handleTeamTest}
      />
    </ScrollView>
  );
}

type TestCardProps = {
  title: string;
  description: string;
  payload: PersonalRestData | TeamRestData;
  state: RequestState;
  actionLabel: string;
  onPress: () => void;
};

function TestCard({
  title,
  description,
  payload,
  state,
  actionLabel,
  onPress,
}: TestCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Sample payload</Text>
        <Text style={styles.code}>{JSON.stringify(payload, null, 2)}</Text>
      </View>

      <Pressable
        onPress={onPress}
        disabled={state.loading}
        style={({ pressed }) => [
          styles.button,
          state.loading && styles.buttonDisabled,
          pressed && !state.loading && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </Pressable>

      <View style={styles.block}>
        <Text style={styles.blockLabel}>Result</Text>

        {!state.comment && !state.error && (
          <Text style={styles.placeholder}>
            No response yet. Run the test to generate a comment.
          </Text>
        )}

        {state.comment ? (
          <Text style={styles.result}>{state.comment}</Text>
        ) : null}

        {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },

  content: {
    padding: 20,
    gap: 16,
  },

  header: {
    gap: 8,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#101828",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475467",
  },

  metaCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    gap: 6,
  },

  metaLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344054",
  },

  metaValue: {
    fontSize: 14,
    color: "#101828",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    gap: 14,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#101828",
  },

  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475467",
  },

  block: {
    gap: 8,
  },

  blockLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344054",
  },

  code: {
    borderRadius: 12,
    backgroundColor: "#0f172a",
    padding: 12,
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Courier",
  },

  button: {
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  placeholder: {
    fontSize: 14,
    color: "#667085",
  },

  result: {
    fontSize: 15,
    lineHeight: 22,
    color: "#101828",
  },

  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#b42318",
  },
});
