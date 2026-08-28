import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  generatePersonalRestComment,
  generateTeamRestComment,
} from "../services/api";

export default function HomeScreen() {
  const [personalComment, setPersonalComment] = useState("");
  const [teamComment, setTeamComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePersonalComment = async () => {
    try {
      setLoading(true);
      setError("");

      const comment = await generatePersonalRestComment({
        sleepHours: 5.5,
        restMinutes: 15,
        restTime: "14:30",
        wakeScore: 4,
        selfInitiated: false,
        restFrequency: 2,
        encouragedOthers: true,

        restDurationEvaluation: "appropriate",
        restTimingEvaluation: "good",
        wakeEvaluation: "good",
        restFrequencyEvaluation: "appropriate",
        selfInitiatedEvaluation: "notification",
      });

      setPersonalComment(comment);
    } catch (err) {
      console.error(err);
      setError("個人コメントの生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleTeamComment = async () => {
    try {
      setLoading(true);
      setError("");

      const comment = await generateTeamRestComment({
        teamAverageScore: 68,
        memberCount: 5,
        averageRestMinutes: 14,
        selfInitiatedRate: 0.6,
        encouragementCount: 4,

        teamRestEvaluation: "normal",
        encouragementEvaluation: "active",
      });

      setTeamComment(comment);
    } catch (err) {
      console.error(err);
      setError("チームコメントの生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Nap AI Test</Text>

      <Button
        title="RESTコメントを生成"
        onPress={handlePersonalComment}
      />

      {personalComment !== "" && (
        <Text style={styles.comment}>
          {personalComment}
        </Text>
      )}

      <Button
        title="TEAMコメントを生成"
        onPress={handleTeamComment}
      />

      {teamComment !== "" && (
        <Text style={styles.comment}>
          {teamComment}
        </Text>
      )}

      {loading && <ActivityIndicator />}

      {error !== "" && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
  },

  comment: {
    fontSize: 16,
  },

  error: {
    fontSize: 14,
  },
});





// import { Text, View } from "react-native";

// export default function HomeScreen() {
//   return (
//     <View>
//       <Text>Sleep Nap</Text>
//     </View>
//   );
// }

return <Redirect href="/home" />;
*/
