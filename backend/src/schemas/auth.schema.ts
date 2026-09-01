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

export const passwordResetRequestBody = z.object({ email });

export const passwordResetConfirmBody = z.object({
  token: z.string().min(1, "トークンが必要です"),
  password,
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください").max(200),
  newPassword: password,
});

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1, "名前を入力してください").max(50),
    email,
  })
  .partial()
  .refine(
    (v) => v.name !== undefined || v.email !== undefined,
    "名前またはメールアドレスを入力してください",
  );
