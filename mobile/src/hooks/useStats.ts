import { useEffect, useState } from "react";

import { getStats } from "@/services/stats";

import type {
  PersonalStatsResponse,
  TeamStatsResponse,
} from "@/types/api";

export function useStats() {
  const [personal, setPersonal] = useState<PersonalStatsResponse | null>(null);
  const [team, setTeam] = useState<TeamStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getStats()
      .then((result) => {
        if (active) {
          setPersonal(result.personal);
          setTeam(result.team);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { personal, team, loading, error };
}
