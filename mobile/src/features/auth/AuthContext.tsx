import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setAuthToken, setUnauthorizedHandler } from "@/services/api";
import { authStorage } from "@/services/authStorage";
import * as authApi from "@/services/authApi";

import type { AuthResult, AuthUser } from "@/types/api";

type AuthStatus = "loading" | "signedIn" | "signedOut";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** Store the token from a login / signup response and mark signed-in. */
  signIn: (result: AuthResult) => Promise<void>;
  /** Revoke the session (best-effort) and clear local state. */
  signOut: () => Promise<void>;
  /** Permanently delete the account, then clear local state. */
  deleteAccount: () => Promise<void>;
  /** Re-fetch `/auth/me` (e.g. after completing onboarding). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const bootstrapped = useRef(false);

  const clearLocal = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setStatus("signedOut");
    void authStorage.clearToken();
  }, []);

  const signIn = useCallback(async (result: AuthResult) => {
    await authStorage.setToken(result.token);
    setAuthToken(result.token);
    setUser(result.user);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // token may already be invalid — clearing locally is enough
    }
    clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    clearLocal();
  }, [clearLocal]);

  const refresh = useCallback(async () => {
    try {
      const { user: fresh } = await authApi.getMe();
      setUser(fresh);
      setStatus("signedIn");
    } catch {
      clearLocal();
    }
  }, [clearLocal]);

  // A 401 on any request means the session is gone — drop to signed-out
  // without another round-trip.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearLocal();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocal]);

  // Restore a stored session on cold start.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      const token = await authStorage.getToken();
      if (!token) {
        setStatus("signedOut");
        return;
      }
      setAuthToken(token);
      try {
        const { user: fresh } = await authApi.getMe();
        setUser(fresh);
        setStatus("signedIn");
      } catch {
        clearLocal();
      }
    })();
  }, [clearLocal]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, deleteAccount, refresh }),
    [status, user, signIn, signOut, deleteAccount, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
