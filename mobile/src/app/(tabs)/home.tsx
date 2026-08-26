import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

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
});
