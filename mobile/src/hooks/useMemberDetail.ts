import { useEffect, useState } from "react";

import { getMemberDetail } from "@/services/members";

import type { MemberDetailResponse } from "@/types/api";

export function useMemberDetail(id: string | undefined) {
  const [data, setData] = useState<MemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [id]);

  return {
    data,
    loading,
    error,
  };
}
