import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Persistent store for the session bearer token. `expo-secure-store` on
 * native (Keychain / Keystore); `localStorage` on web where SecureStore
 * is a no-op.
 */

const TOKEN_KEY = "teamnap.session.token";

const webStore = {
  getItemAsync: async (key: string): Promise<string | null> =>
    typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

const store = Platform.OS === "web" ? webStore : SecureStore;

export const authStorage = {
  getToken: (): Promise<string | null> => store.getItemAsync(TOKEN_KEY),
  setToken: (token: string): Promise<void> =>
    store.setItemAsync(TOKEN_KEY, token),
  clearToken: (): Promise<void> => store.deleteItemAsync(TOKEN_KEY),
};
