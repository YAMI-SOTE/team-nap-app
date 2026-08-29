import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { router } from "expo-router";

import { useHealth } from "@/hooks/useHealth";

export default function HomeScreen() {
  const { data, loading, error } = useHealth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Nap</Text>

      <Text style={styles.subtitle}>Backend connection</Text>

      {loading && <ActivityIndicator />}

      {error && <Text style={styles.error}>Backend offline: {error}</Text>}

      {data && (
        <Text style={styles.success}>
          {data.service}: {data.status}
        </Text>
      )}

      <Pressable
        onPress={() => {
          router.push("/ai-test");
        }}
        style={({ pressed }) => [
          styles.devButton,
          pressed && styles.devButtonPressed,
        ]}
      >
        <Text style={styles.devButtonText}>Open AI Test</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
  },

  success: {
    fontSize: 16,
  },

  error: {
    fontSize: 16,
  },

  devButton: {
    marginTop: 24,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  devButtonPressed: {
    opacity: 0.85,
  },

  devButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
