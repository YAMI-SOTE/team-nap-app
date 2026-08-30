import { useEffect, useState } from "react";

import { getDaySchedule } from "@/services/schedule";
import { toISODate } from "@/utils/date";

import type { DayScheduleResponse } from "@/types/api";

export function useSchedule(date: Date) {
  const [data, setData] = useState<DayScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the selected calendar day changes.
  const dayKey = toISODate(date);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const result = await getDaySchedule(new Date(dayKey));
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [dayKey]);

  return { data, loading, error };
}
