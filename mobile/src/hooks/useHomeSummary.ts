import { useEffect, useState } from "react";

import { getHomeSummary } from "@/services/home";

import type { HomeSummaryResponse } from "@/types/api";

export function useHomeSummary() {
  const [data, setData] = useState<HomeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHomeSummary() {
      try {
        const result = await getHomeSummary();

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
