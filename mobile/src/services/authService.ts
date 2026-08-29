/**
 * 認証関連のAPI呼び出しをまとめるサービス層。
 *
 * TODO(backend): 実際のエンドポイントが決まったら BASE_URL と
 * login() 内の fetch 部分を差し替える。呼び出し側（useLogin フック）は
 * 変更不要になるよう、戻り値の型 (LoginResult) だけ契約として守ること。
 *
 * 想定しているバックエンドとの契約（要すり合わせ）:
 *   POST {BASE_URL}/auth/login
 *   body: { email: string, password: string }
 *   200: { token: string, user: { id: string, name: string } }
 *   401: { message: string }  -> 認証失敗
 *   その他エラー: { message: string }
 */

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.example.com";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  user: {
    id: string;
    name: string;
  };
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export type SignUpPayload = {
  email: string;
  password: string;
};

/**
 * 新規登録API。契約は login() と同様、バックエンド確定後に
 * 本番実装へ差し替える想定（POST {BASE_URL}/auth/signup を想定）。
 */
export async function signUp({
  email,
  password,
}: SignUpPayload): Promise<LoginResult> {
  // --- 本番実装（バックエンドAPIが確定したらこちらを使う） -----------------
  // const response = await fetch(`${BASE_URL}/auth/signup`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });
  //
  // if (!response.ok) {
  //   const body = await response.json().catch(() => null);
  //   throw new AuthError(body?.message ?? '登録に失敗しました');
  // }
  //
  // return response.json();
  // --------------------------------------------------------------------

  // --- 仮実装（API未接続の間のモック） -------------------------------------
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!email.includes("@")) {
    throw new AuthError("メールアドレスの形式が正しくありません");
  }

  return {
    token: "mock-token",
    user: { id: "mock-user-id", name: "新規ユーザー" },
  };
  // --------------------------------------------------------------------
}

/**
 * Googleログイン。
 *
 * TODO(frontend): 実装にはGoogle Cloud ConsoleでOAuthクライアントID
 * （iOS用・Android用・Web用）の発行が必要。取得後、以下のいずれかで実装する。
 *   - expo-auth-session/providers/google（Expo Go含め動作する定番構成）
 *   - @react-native-google-signin/google-signin（ネイティブ実装、要Dev Client/EASビルド）
 *
 * 取得後の実装イメージ:
 *   1. `npx expo install expo-auth-session expo-crypto` を追加
 *   2. Google.useAuthRequest({ iosClientId, androidClientId, webClientId }) でトークン取得
 *   3. 取得したidTokenをバックエンドに送り、自前セッション（token）に交換する
 *      エンドポイントをバックエンド担当とすり合わせる（例: POST /auth/google）
 *
 * 現状はUIのみのため、呼ばれても未実装エラーを投げる。
 */
export async function signInWithGoogle(): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    token: "mock-google-token",
    user: { id: "mock-google-user-id", name: "Google Test User" },
  };
}

export async function login({
  email,
  password,
}: LoginPayload): Promise<LoginResult> {
  // --- 本番実装（バックエンドAPIが確定したらこちらを使う） -----------------
  // const response = await fetch(`${BASE_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // });
  //
  // if (!response.ok) {
  //   const body = await response.json().catch(() => null);
  //   throw new AuthError(body?.message ?? 'ログインに失敗しました');
  // }
  //
  // return response.json();
  // --------------------------------------------------------------------

  // --- 仮実装（API未接続の間のモック） -------------------------------------
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    token: "mock-token",
    user: { id: "mock-user-id", name: "テストユーザー" },
  };
  // --------------------------------------------------------------------
}
