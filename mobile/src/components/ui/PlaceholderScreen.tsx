import { StyleSheet, Text, View } from "react-native";

interface PlaceholderScreenProps {
  title: string;
  description?: string;
}

export function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  description: {
    marginTop: 8,
    fontSize: 16,
    textAlign: "center",
  },
});
