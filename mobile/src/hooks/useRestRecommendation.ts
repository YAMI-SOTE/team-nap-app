import { useEffect, useState } from "react";

import {
  getRestRecommendation,
  type RestDecisionResponse,
} from "@/services/rest";
import { useAuth } from "@/features/auth/AuthContext";

export function useRestRecommendation() {
  const { status } = useAuth();
  const [data, setData] = useState<RestDecisionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signedIn") return;

    let active = true;

    async function loadRestRecommendation() {
      try {
        const result = await getRestRecommendation();

        if (!active) {
          return;
        }

        setData(result);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "休息提案の取得に失敗しました",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRestRecommendation();

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