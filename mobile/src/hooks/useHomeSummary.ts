import { useEffect, useState } from "react";

import {
  getHomeMemberStatus,
  getHomeSummary,
} from "@/services/home";

import type {
  HomeMemberStatusResponse,
  HomeSummaryResponse,
} from "@/types/api";

type HomeScreenData = {
  summary: HomeSummaryResponse;
  memberStatus: HomeMemberStatusResponse;
};

export function useHomeSummary() {
  const [data, setData] = useState<HomeScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHomeSummary() {
      try {
        const [summary, memberStatus] = await Promise.all([
          getHomeSummary(),
          getHomeMemberStatus(),
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

        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHomeSummary();

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
