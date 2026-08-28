//
import { useEffect, useState } from "react";

import { api } from "@/services/api"; // Declaration of Types
import type { HealthResponse } from "@/types/api"; // types of API response

export function useHealth() {
  // Custom hook to check the health of the API, basically a wrapper around the API call to /health endpoint. It returns the health status, loading state, and any error that occurred during the request.
  const [data, setData] = useState<HealthResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const result = await api.get<HealthResponse>("/health");

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  return {
    data,
    loading,
    error,
  };
}
