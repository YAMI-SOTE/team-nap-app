import { useCallback, useEffect, useRef, useState } from "react";

import { getDaySchedule } from "@/services/schedule";
import { isConnectionError } from "@/services/api";
import { toISODate } from "@/utils/date";

import type { DayScheduleResponse } from "@/types/api";

export function useSchedule(date: Date) {
  const [data, setData] = useState<DayScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  /** True from the moment `reload()` is called until that fetch settles. */
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Bumping the key re-runs the effect below. A resolved promise lets the
  // caller (pull-to-refresh) await the fetch.
  const resolversRef = useRef<Array<() => void>>([]);
  const reload = useCallback(() => {
    setRevalidating(true);
    setReloadKey((k) => k + 1);
    return new Promise<void>((resolve) => {
      resolversRef.current.push(resolve);
    });
  }, []);

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
        if (active) {
          setLoading(false);
          setRevalidating(false);
          const resolvers = resolversRef.current;
          resolversRef.current = [];
          resolvers.forEach((r) => r());
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [dayKey, reloadKey]);

  return { data, loading, revalidating, error, connectionError, reload };
}
