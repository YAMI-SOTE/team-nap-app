import { useEffect, useState } from "react";

import { getTeamSummary } from "@/services/team";

import type { TeamSummaryResponse } from "@/types/api";

export function useTeamSummary() {
  const [data, setData] = useState<TeamSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTeamSummary() {
      try {
        const result = await getTeamSummary();

        if (!active) {
          return;
        }

        setData(result);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTeamSummary();

    return () => {
      active = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
  };
}
