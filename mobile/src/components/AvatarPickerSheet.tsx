import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import DefaultAvatar, {
  DEFAULT_AVATAR_TYPES,
  type DefaultAvatarType,
} from "@/components/DefaultAvatar";
import PillButton from "@/components/PillButton";
import { CheckCircleIcon, PencilSimpleIcon } from "@/components/icons";

const SLOT_SIZE = 64;

type AvatarPickerSheetProps = {
  visible: boolean;
  /** 現在選ばれているデフォルトアイコン。 */
  value: DefaultAvatarType;
  onCancel: () => void;
  onConfirm: (value: DefaultAvatarType) => void;
  /** 「写真」枠のタップ。端末の画像選択を開く想定。 */
  onPickPhoto?: () => void;
};

/**
 * アイコン選択のボトムシート（Figma OV-08_Avatar_Picker, node 866:3738）。
 * デフォルト3種から選ぶか、写真をアップロードする。
 */
export default function AvatarPickerSheet({
  visible,
  value,
  onCancel,
  onConfirm,
  onPickPhoto,
}: AvatarPickerSheetProps) {
  const [selected, setSelected] = useState<DefaultAvatarType>(value);

  // シートを開くたびに現在値へ戻す。
  useEffect(() => {
    if (visible) {
      setSelected(value);
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
        <View style={styles.handle} />

        <Text style={styles.title}>アイコンを選ぶ</Text>
        <Text style={styles.subtitle}>
          デフォルトから選ぶか、写真をアップロードできます
        </Text>

        <View style={styles.options}>
          {DEFAULT_AVATAR_TYPES.map((type) => {
            const active = type === selected;
            return (
              <Pressable
                key={type}
                onPress={() => setSelected(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`アイコン ${type}`}
                style={[styles.slot, active && styles.slotActive]}
              >
                <DefaultAvatar type={type} size={SLOT_SIZE} />
                {active ? (
                  <View style={styles.check}>
                    <CheckCircleIcon size={18} color={colors.primary} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <View style={styles.photoOption}>
            <Pressable
              onPress={onPickPhoto}
              accessibilityRole="button"
              accessibilityLabel="写真をアップロード"
              style={[styles.slot, styles.photoSlot]}
            >
              <PencilSimpleIcon size={22} color={colors.primary} />
            </Pressable>
            <Text style={styles.photoLabel}>写真</Text>
          </View>
        </View>

        <PillButton
          label="このアイコンにする"
          onPress={() => onConfirm(selected)}
          elevated={false}
          style={styles.confirmButton}
          textStyle={styles.confirmLabel}
        />
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
    backgroundColor: "rgba(18,41,44,0.45)",
  },
  sheet: {
    marginTop: "auto",
    alignItems: "center",
    gap: 14,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderDefault,
  },
  title: {
    fontSize: 18,
    lineHeight: 29,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  options: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  slotActive: {
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  check: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  photoOption: {
    alignItems: "center",
    gap: 8,
  },
  photoSlot: {
    backgroundColor: "#F2F6F6",
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderColor: "rgba(0,156,160,0.5)",
  },
  photoLabel: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  confirmButton: {
    paddingVertical: 10,
  },
  confirmLabel: {
    lineHeight: 27,
  },
});
