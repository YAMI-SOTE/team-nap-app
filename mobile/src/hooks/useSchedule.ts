import { useCallback, useEffect, useState } from "react";

import { getDaySchedule } from "@/services/schedule";
import { isConnectionError } from "@/services/api";
import { toISODate } from "@/utils/date";

import type { DayScheduleResponse } from "@/types/api";

export function useSchedule(date: Date) {
  const [data, setData] = useState<DayScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Re-fetch whenever the selected calendar day changes.
  const dayKey = toISODate(date);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setConnectionError(false);

    async function load() {
      try {
        const result = await getDaySchedule(new Date(dayKey));
        if (active) setData(result);
      } catch (err) {
        if (!active) return;
        if (isConnectionError(err)) {
          setConnectionError(true);
        } else {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [dayKey, reloadKey]);

  return { data, loading, error, connectionError, reload };
}
