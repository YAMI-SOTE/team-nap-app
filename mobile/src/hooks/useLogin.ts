import { useState } from "react";
import {
  login,
  signInWithGoogle,
  AuthError,
  LoginResult,
} from "../services/authService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UseLoginResult = {
  email: string;
  password: string;
  isSubmitting: boolean;
  isGoogleSubmitting: boolean;
  errorMessage: string | null;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  submit: () => Promise<LoginResult | null>;
  submitWithGoogle: () => Promise<LoginResult | null>;
};

/**
 * ログイン画面の状態とバリデーション・送信処理をまとめたフック。
 * 画面コンポーネント側は表示に専念できるようにする。
 */
export function useLogin(): UseLoginResult {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return "メールアドレスを入力してください";
    if (!EMAIL_REGEX.test(email))
      return "メールアドレスの形式が正しくありません";
    if (!password) return "パスワードを入力してください";
    return null;
  };

  const submit = async (): Promise<LoginResult | null> => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return null;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await login({ email, password });
      return result;
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "通信エラーが発生しました";
      setErrorMessage(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitWithGoogle = async (): Promise<LoginResult | null> => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await signInWithGoogle();
      return result;
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "通信エラーが発生しました";
      setErrorMessage(message);
      return null;
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return {
    email,
    password,
    isSubmitting,
    isGoogleSubmitting,
    errorMessage,
    setEmail,
    setPassword,
    submit,
    submitWithGoogle,
  };
}
