import { useCallback, useEffect, useState } from "react";

import { useRealtimeRevision } from "@/features/realtime/RealtimeProvider";
import {
  getSharedMemberStatus,
  getTeamSummary,
} from "@/services/team";
import { isConnectionError } from "@/services/api";
import { useAuth } from "@/features/auth/AuthContext";

import type {
  HomeMemberStatusResponse,
  TeamSummaryResponse,
} from "@/types/api";

type TeamScreenData = {
  summary: TeamSummaryResponse;
  memberStatus: HomeMemberStatusResponse;
};

export function useTeamSummary() {
  const { status } = useAuth();
  const [data, setData] = useState<TeamScreenData | null>(null);
  const [hasTeam, setHasTeam] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Re-read when the server says the team changed (rename, roster).
  const revision = useRealtimeRevision("team");

  useEffect(() => {
    if (status !== "signedIn") return;

    let active = true;
    setLoading(true);
    setError(null);
    setConnectionError(false);

    async function loadTeamSummary() {
      try {
        const [summary, memberStatus] = await Promise.all([
          getTeamSummary(),
          getSharedMemberStatus(),
        ]);
        if (!active) return;

        if (!summary) {
          setHasTeam(false);
          setData(null);
          return;
        }
        setHasTeam(true);
        setData({ summary, memberStatus });
      } catch (err) {
        if (!active) return;
        if (isConnectionError(err)) {
          setConnectionError(true);
        } else {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTeamSummary();
    return () => {
      active = false;
    };
  }, [reloadKey, status, revision]);

  return { data, hasTeam, loading, error, connectionError, reload };
}
