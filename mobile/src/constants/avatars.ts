import type { ImageSourcePropType } from "react-native";

/**
 * Selectable avatars. A small placeholder set for now (pixel-art from the
 * Figma "Avatar / Default" component, node 858-3687) — more will be added
 * later, so treat this list as the single source of truth: the picker,
 * the <Avatar> renderer and the backend `avatar` enum all follow it.
 */
export type AvatarId = "cat" | "man" | "woman";

export type AvatarOption = {
  id: AvatarId;
  /** Accessibility / picker label. */
  label: string;
  source: ImageSourcePropType;
};

export const AVATARS: readonly AvatarOption[] = [
  {
    id: "cat",
    label: "ネコ",
    source: require("../../assets/avatars/cat.png"),
  },
  {
    id: "man",
    label: "男の子",
    source: require("../../assets/avatars/man.png"),
  },
  {
    id: "woman",
    label: "女の子",
    source: require("../../assets/avatars/woman.png"),
  },
] as const;

const BY_ID: Record<AvatarId, AvatarOption> = AVATARS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AvatarId, AvatarOption>,
);

/** True when `id` is one of the known avatar ids. */
export function isAvatarId(id: string | null | undefined): id is AvatarId {
  return id != null && id in BY_ID;
}

/** Image source for a stored avatar id, or `null` to fall back to initials. */
export function avatarSource(
  id: string | null | undefined,
): ImageSourcePropType | null {
  return isAvatarId(id) ? BY_ID[id].source : null;
}
