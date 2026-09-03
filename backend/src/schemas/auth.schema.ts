import { z } from "zod";

const email = z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(254);
const password = z.string().min(8, "パスワードは8文字以上で入力してください").max(200);

export const signUpBody = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50),
  email,
  password,
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, "パスワードを入力してください").max(200),
});

export const sessionIdParams = z.object({
  id: z.string().uuid(),
});

/** `POST /auth/google` and `POST /auth/google/link` — OAuth code + PKCE. */
export const googleAuthBody = z.object({
  code: z.string().min(1, "認可コードが必要です"),
  codeVerifier: z.string().min(1, "codeVerifier が必要です"),
  redirectUri: z.string().url("redirectUri の形式が正しくありません"),
  /** Which OAuth client id the app used (web / ios / android). */
  clientId: z.string().min(1).optional(),
});

export const passwordResetRequestBody = z.object({ email });

export const passwordResetConfirmBody = z.object({
  token: z.string().min(1, "トークンが必要です"),
  password,
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください").max(200),
  newPassword: password,
});

/** Avatar id — a small placeholder set for now (see mobile constants/avatars). */
const avatar = z
  .enum(["cat", "man", "woman"], { error: "アイコンの選択が正しくありません" })
  .nullable();

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1, "名前を入力してください").max(50),
    email,
    avatar,
  })
  .partial()
  .refine(
    (v) =>
      v.name !== undefined || v.email !== undefined || v.avatar !== undefined,
    "更新する項目を入力してください",
  );
