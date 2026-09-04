import { useEffect, useState } from "react";

import {
  getHomeMemberStatus,
  getHomeSummary,
} from "@/services/home";
import { useAuth } from "@/features/auth/AuthContext";

import type {
  HomeMemberStatusResponse,
  HomeSummaryResponse,
} from "@/types/api";

type HomeScreenData = {
  summary: HomeSummaryResponse;
  memberStatus: HomeMemberStatusResponse;
};

export function useHomeSummary() {
  const { status } = useAuth();
  const [data, setData] = useState<HomeScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch once we actually have a session — otherwise the request
    // 401s and (before this guard) would tear the session down.
    if (status !== "signedIn") return;

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
  }, [status]);

  return {
    data,
    loading,
    error,
  };
}
