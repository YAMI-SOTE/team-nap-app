import { useEffect, useState } from "react";

import { getTeamRanking } from "@/services/team";

import type { TeamRankingResponse } from "@/types/api";

export function useTeamRanking() {
  const [data, setData] = useState<TeamRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getTeamRanking()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
