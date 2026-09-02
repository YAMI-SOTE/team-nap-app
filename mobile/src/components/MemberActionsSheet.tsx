import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/spacing";
import DefaultAvatar, {
  type DefaultAvatarType,
} from "@/components/DefaultAvatar";
import { CrownSimpleIcon, SignOutIcon } from "@/components/icons";

type MemberActionsSheetProps = {
  visible: boolean;
  name: string;
  /** 「メンバー ・ 仮眠中」のようなサブテキスト。 */
  subtitle: string;
  avatar: DefaultAvatarType;
  avatarUri?: string;
  /** 既に管理者なら「管理者にする」を出さない。 */
  canPromote?: boolean;
  onPromote: () => void;
  onRemove: () => void;
  onCancel: () => void;
};

/**
 * メンバー操作のボトムシート（Figma OV-06_Member_Actions, node 865:3733）。
 * メンバー管理画面の「…」から開く。
 */
export default function MemberActionsSheet({
  visible,
  name,
  subtitle,
  avatar,
  avatarUri,
  canPromote = true,
  onPromote,
  onRemove,
  onCancel,
}: MemberActionsSheetProps) {
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

        <View style={styles.head}>
          <DefaultAvatar type={avatar} size={56} imageUri={avatarUri} />
          <View style={styles.headText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {canPromote ? (
          <Pressable
            style={styles.action}
            onPress={onPromote}
            accessibilityRole="button"
          >
            <CrownSimpleIcon size={22} color={colors.textPrimary} />
            <Text style={styles.actionLabel}>管理者にする</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.action}
          onPress={onRemove}
          accessibilityRole="button"
        >
          <SignOutIcon size={22} color={colors.textDanger} />
          <Text style={[styles.actionLabel, styles.actionLabelDanger]}>
            チームから外す
          </Text>
        </Pressable>

        <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.cancel}>キャンセル</Text>
        </Pressable>
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
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headText: {
    gap: 2,
  },
  name: {
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
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(18,41,43,0.08)",
  },
  action: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  actionLabelDanger: {
    color: colors.textDanger,
  },
  cancel: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },
});
