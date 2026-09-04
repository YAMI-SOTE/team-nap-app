import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "@/features/auth/AuthContext";
import { realtime } from "@/services/realtime";
import { authStorage } from "@/services/authStorage";

import type { HomeMemberStatusResponse } from "@/types/api";

type RealtimeContextValue = {
  /** Latest team member-status snapshot pushed by the server, or `null`. */
  memberStatus: HomeMemberStatusResponse | null;
  /** Whether the presence socket is currently connected. */
  connected: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Connects the presence WebSocket while signed in and exposes the latest
 * team member-status snapshot. Screens that show the roster overlay this
 * over their fetched data so "作業中 / 仮眠中" updates live.
 */
export function RealtimeProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const [memberStatus, setMemberStatus] =
    useState<HomeMemberStatusResponse | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const offEvent = realtime.on((event) => {
      if (event.type === "member-status") setMemberStatus(event.data);
    });
    const offStatus = realtime.onStatus(setConnected);
    return () => {
      offEvent();
      offStatus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (status === "signedIn") {
      authStorage.getToken().then((token) => {
        if (active && token) realtime.connect(token);
      });
    } else {
      realtime.disconnect();
      setMemberStatus(null);
    }
    return () => {
      active = false;
    };
  }, [status]);

  // Coming back to the foreground is the moment presence is most likely
  // to be wrong: the socket died while the app was suspended, so the team
  // still sees this member as 作業中 and this member sees a stale roster.
  // Reconnect immediately instead of waiting out the backoff.
  useEffect(() => {
    if (status !== "signedIn") return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") realtime.ensureConnected();
    });
    return () => sub.remove();
  }, [status]);

  const value = useMemo(
    () => ({ memberStatus, connected }),
    [memberStatus, connected],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeMembers(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtimeMembers must be used within <RealtimeProvider>");
  }
  return ctx;
}
