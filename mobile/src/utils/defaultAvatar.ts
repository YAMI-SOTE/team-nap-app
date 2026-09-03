import { AVATARS, type AvatarId } from "@/constants/avatars";

/**
 * まだアイコンを選んでいないメンバー用に、IDから決定的に1つ選ぶ。
 *
 * 画像そのものは `constants/avatars` が単一の情報源なので、ここでは
 * どの `AvatarId` を割り当てるかだけを決める。バックエンドがメンバー
 * 一覧にも `avatar` を返すようになったら、この関数は不要になる。
 */
export function defaultAvatarFor(seed: string): AvatarId {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return AVATARS[hash % AVATARS.length]!.id;
}
