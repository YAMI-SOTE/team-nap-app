import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme/colors";
import Avatar from "@/components/Avatar";
import { defaultAvatarFor } from "@/utils/defaultAvatar";

export type MemberStatus = "working" | "resting" | "offline";

type MemberAvatarProps = {
  /** Short label shown under the avatar (e.g. a name initial). */
  label: string;
  /** Presence state — drives the status dot color. */
  status: MemberStatus;
  /** Optional avatar photo. Falls back to a default icon (cat / man / woman). */
  /**
   * 写真未設定のときにどのデフォルトアイコンを出すかを決める種。
   * 通常はメンバーIDを渡す（同じ人には常に同じ絵が出る）。
   * 省略時は label を使う。
   */
  avatarSeed?: string;
  /** Render the label under the avatar. Default `true`. */
  showLabel?: boolean;
  /**
   * 仮眠中(`status === "resting"`)のときに "Zzz" バッジと寝息の泡を出す。
   * Figma の member コンポーネント sleeping バリアント（node 733:4219）。
   * チーム画面のアバター行だけで使うので既定はオフ。
   */
  napBadge?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const AVATAR_SIZE = 40;
const DOT_SIZE = 16;

const STATUS_COLOR: Record<MemberStatus, string> = {
  working: colors.statusWorking,
  resting: colors.primary,
  offline: colors.statusOffline,
};

/**
 * Member presence chip used in the Home screen "メンバーのようす" row
 * (Figma "member" 138:625 + "login status").
 */
export default function MemberAvatar({
  label,
  status,
  avatarSeed,
  showLabel = true,
  napBadge = false,
  onPress,
  style,
}: MemberAvatarProps) {
  const Container = onPress ? Pressable : View;
  const napping = napBadge && status === "resting";

  return (
    <Container
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? label : undefined}
    >
      <View style={styles.avatarWrap}>
        <Avatar
          avatarId={defaultAvatarFor(avatarSeed ?? label)}
          name={label}
          size={AVATAR_SIZE}
        />

        <View
          style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]}
        />
        {napping ? (
          <>
            <View style={[styles.napDot, styles.napDotSmall]} />
            <View style={[styles.napDot, styles.napDotLarge]} />
            <View style={styles.napBadge}>
              <Text style={styles.napBadgeText}>Zzz</Text>
            </View>
          </>
        ) : null}
      </View>
      {showLabel ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
    width: 42,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.white,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  napBadge: {
    position: "absolute",
    left: 29,
    top: -13,
    width: 30,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  napBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.white,
  },
  napDot: {
    position: "absolute",
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  napDotSmall: {
    left: 24,
    top: 4,
    width: 4,
    height: 4,
  },
  napDotLarge: {
    left: 26,
    top: -2,
    width: 6,
    height: 6,
  },
});
