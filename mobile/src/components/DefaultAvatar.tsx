import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

/**
 * 写真を設定していないユーザーのデフォルトアイコン
 * （Figma「Avatar / Default」node 858:3687 の Cat / Man / Woman）。
 */

export type DefaultAvatarType = "cat" | "man" | "woman";

export const DEFAULT_AVATAR_TYPES: DefaultAvatarType[] = [
  "cat",
  "man",
  "woman",
];

const SOURCES: Record<DefaultAvatarType, ImageSourcePropType> = {
  cat: require("../../assets/avatars/cat.png"),
  man: require("../../assets/avatars/man.png"),
  woman: require("../../assets/avatars/woman.png"),
};

/**
 * メンバーIDから決定的にデフォルトアイコンを選ぶ。
 * バックエンドがアイコンを返すようになるまでの繋ぎで、
 * 同じメンバーには常に同じ絵が出るようにしておく。
 */
export function defaultAvatarFor(seed: string): DefaultAvatarType {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return DEFAULT_AVATAR_TYPES[hash % DEFAULT_AVATAR_TYPES.length];
}

type DefaultAvatarProps = {
  type: DefaultAvatarType;
  /** 一辺の px。Figma は一覧40 / シート56 / 選択64。 */
  size?: number;
  /** ユーザーが写真を設定済みならそのURI。 */
  imageUri?: string;
  style?: ViewStyle;
};

export default function DefaultAvatar({
  type,
  size = 40,
  imageUri,
  style,
}: DefaultAvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, shape, style]}>
      <Image
        source={imageUri ? { uri: imageUri } : SOURCES[type]}
        style={[styles.image, shape]}
        resizeMode="cover"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
