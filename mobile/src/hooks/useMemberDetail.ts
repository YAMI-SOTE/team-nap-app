import { useEffect, useMemo, useRef, useState } from "react";

import { getMemberDetail } from "@/services/members";
import { useRealtimeRevision } from "@/features/realtime/RealtimeProvider";

import type { MemberDetailResponse } from "@/types/api";

/** How often the local「あと◯分」countdown is recomputed. */
const TICK_MS = 30_000;

export function useMemberDetail(id: string | undefined) {
  const [data, setData] = useState<MemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // When the current `data` was received, so the countdown below can age
  // it without another request.
  const fetchedAtRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  // Teammates starting or ending a nap invalidate "member" server-side.
  const revision = useRealtimeRevision("member");

  useEffect(() => {
    if (!id) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    async function loadMemberDetail(memberId: string) {
      try {
        const result = await getMemberDetail(memberId);

        if (!active) {
          return;
        }

        fetchedAtRef.current = Date.now();
        setNow(Date.now());
        setData(result);
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

    loadMemberDetail(id);

    return () => {
      active = false;
    };
  }, [id, revision]);

  // `minutesRemaining` is a number the server computed at fetch time; left
  // alone it just sits there while the nap actually runs down. Re-render
  // on a timer so the card counts down, and only while there is a nap to
  // count.
  const hasNap = data?.nap != null;
  useEffect(() => {
    if (!hasNap) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [hasNap]);

  const live = useMemo<MemberDetailResponse | null>(() => {
    if (!data?.nap) return data;
    const elapsedMinutes = Math.floor((now - fetchedAtRef.current) / 60_000);
    const minutesRemaining = Math.max(
      0,
      data.nap.minutesRemaining - elapsedMinutes,
    );
    if (minutesRemaining === data.nap.minutesRemaining) return data;
    return { ...data, nap: { ...data.nap, minutesRemaining } };
  }, [data, now]);

  return {
    data: live,
    loading,
    error,
  };
}
