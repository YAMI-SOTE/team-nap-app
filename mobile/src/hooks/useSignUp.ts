import { useState } from "react";
import {
  signUp,
  signInWithGoogle,
  AuthError,
  LoginResult,
} from "../services/authService";
import { useAuth } from "@/features/auth/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type UseSignUpResult = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  isGoogleSubmitting: boolean;
  errorMessage: string | null;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  submit: () => Promise<LoginResult | null>;
  submitWithGoogle: () => Promise<LoginResult | null>;
};

/**
 * 新規登録画面の状態とバリデーション・送信処理をまとめたフック。
 * useLogin と対になる構成にしている。
 */
export function useSignUp(): UseSignUpResult {
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim()) return "お名前を入力してください";
    if (!email.trim()) return "メールアドレスを入力してください";
    if (!EMAIL_REGEX.test(email))
      return "メールアドレスの形式が正しくありません";
    if (!password) return "パスワードを入力してください";
    if (password.length < MIN_PASSWORD_LENGTH)
      return `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`;
    if (password !== confirmPassword) return "パスワードが一致しません";
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
      const result = await signUp({ name: name.trim(), email, password });
      await signIn(result);
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
      await signIn(result);
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
    name,
    email,
    password,
    confirmPassword,
    isSubmitting,
    isGoogleSubmitting,
    errorMessage,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
    submitWithGoogle,
  };
}
