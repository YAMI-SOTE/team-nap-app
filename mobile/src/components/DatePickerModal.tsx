import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import DatePicker from "@/components/DatePicker";
import PillButton from "@/components/PillButton";

type DatePickerModalProps = {
  visible: boolean;
  value: Date;
  title?: string;
  onCancel: () => void;
  onConfirm: (value: Date) => void;
};

/**
 * Bottom-sheet date picker — wraps the `DatePicker` week strip. Uses the
 * built-in RN `Modal`, so no extra dependency (mirrors `TimePickerModal`).
 */
export default function DatePickerModal({
  visible,
  value,
  title,
  onCancel,
  onConfirm,
}: DatePickerModalProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        {title ? <Text style={styles.title}>{title}</Text> : null}

        <DatePicker selectedDate={draft} onChangeDate={setDraft} />

        <View style={styles.actions}>
          <PillButton
            variant="outline"
            label="キャンセル"
            onPress={onCancel}
            textStyle={styles.actionText}
            style={styles.actionButton}
          />
          <PillButton
            variant="primary"
            label="決定"
            elevated={false}
            onPress={() => onConfirm(draft)}
            textStyle={styles.actionText}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18,41,44,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 20,
  },
  title: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 47,
    minHeight: 47,
  },
  actionText: {
    fontSize: 14,
  },
});
