import { useCallback, useEffect, useState } from "react";

import { getStats } from "@/services/stats";
import { isConnectionError } from "@/services/api";

import type {
  PersonalStatsResponse,
  TeamStatsResponse,
} from "@/types/api";

export function useStats() {
  const [personal, setPersonal] = useState<PersonalStatsResponse | null>(null);
  const [team, setTeam] = useState<TeamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setConnectionError(false);

    getStats()
      .then((result) => {
        if (!active) return;
        setPersonal(result.personal);
        setTeam(result.team);
      })
      .catch((err) => {
        if (!active) return;
        if (isConnectionError(err)) {
          setConnectionError(true);
        } else {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return {
    personal,
    team,
    hasTeam: team !== null,
    loading,
    error,
    connectionError,
    reload,
  };
}
