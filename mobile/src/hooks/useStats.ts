import { useEffect, useState } from "react";

import { getPersonalStats, getTeamStats } from "@/services/stats";

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

    Promise.all([getPersonalStats(), getTeamStats()])
      .then(([personalResult, teamResult]) => {
        if (active) {
          setPersonal(personalResult);
          setTeam(teamResult);
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
