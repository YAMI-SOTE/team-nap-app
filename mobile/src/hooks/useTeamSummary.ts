import { useEffect, useState } from "react";

import {
  getSharedMemberStatus,
  getTeamSummary,
} from "@/services/team";

import type {
  HomeMemberStatusResponse,
  TeamSummaryResponse,
} from "@/types/api";

type TeamScreenData = {
  summary: TeamSummaryResponse;
  memberStatus: HomeMemberStatusResponse;
};

export function useTeamSummary() {
  const [data, setData] = useState<TeamScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTeamSummary() {
      try {
        const [summary, memberStatus] = await Promise.all([
          getTeamSummary(),
          getSharedMemberStatus(),
        ]);

        if (!active) {
          return;
        }

        setData({
          summary,
          memberStatus,
        });
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
