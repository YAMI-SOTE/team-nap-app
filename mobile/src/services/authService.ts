/**
 * 認証サービス層。実際の `/api/v1/auth/*` を叩く（薄いラッパーは
 * `authApi.ts`）。呼び出し側（useLogin / useSignUp）は戻り値の型
 * `LoginResult` だけを契約として扱う。
 *
 * セッション（トークン）の保存は `AuthContext.signIn()` の役割。ここでは
 * API 呼び出しとエラー正規化のみ行う。Google ログインは
 * `services/googleAuth.ts`（OAuth フロー）へ委譲する。
 */

import { ApiError } from "@/services/api";
import * as authApi from "@/services/authApi";
import {
  GoogleAuthCancelled,
  isGoogleAuthConfigured,
  signInWithGoogle as runGoogleSignIn,
} from "@/services/googleAuth";

import type { AuthResult, AuthUser } from "@/types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  name: string;
  email: string;
  password: string;
};

/** `{ token, user: { id, name, email, onboardingCompleted } }` */
export type LoginResult = AuthResult;
export type { AuthUser };

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function toAuthError(error: unknown, fallback: string): AuthError {
  if (error instanceof ApiError) {
    return new AuthError(error.message);
  }
  return new AuthError(fallback);
}

export async function login({
  email,
  password,
}: LoginPayload): Promise<LoginResult> {
  try {
    return await authApi.login(email.trim(), password);
  } catch (error) {
    throw toAuthError(error, "通信エラーが発生しました");
  }
}

export async function signUp({
  name,
  email,
  password,
}: SignUpPayload): Promise<LoginResult> {
  try {
    return await authApi.signUp(name.trim(), email.trim(), password);
  } catch (error) {
    throw toAuthError(error, "登録に失敗しました");
  }
}

/**
 * Google ログイン。OAuth 同意（`expo-auth-session`）→ `POST /auth/google`
 * → `{ token, user }`。クライアント id 未設定なら従来どおり無効メッセージ。
 */
export async function signInWithGoogle(): Promise<LoginResult> {
  if (!isGoogleAuthConfigured()) {
    throw new AuthError("Googleログインは現在ご利用いただけません");
  }
  try {
    return await runGoogleSignIn();
  } catch (error) {
    if (error instanceof GoogleAuthCancelled) {
      throw new AuthError(error.message);
    }
    throw toAuthError(error, "Googleログインに失敗しました");
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true; resetToken?: string }> {
  try {
    return await authApi.requestPasswordReset(email.trim());
  } catch (error) {
    throw toAuthError(error, "リセットメールを送信できませんでした");
  }
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  try {
    await authApi.confirmPasswordReset(token.trim(), password);
  } catch (error) {
    throw toAuthError(error, "パスワードを再設定できませんでした");
  }
}
