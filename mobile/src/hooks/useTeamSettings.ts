import { useEffect, useState } from "react";

import { useRealtimeRevision } from "@/features/realtime/RealtimeProvider";
import { getTeamSettings, leaveTeam } from "@/services/settings";
import { removeTeamMember, renameTeam } from "@/services/team";

import type { TeamSettingsResponse } from "@/types/api";

export function useTeamSettings() {
  const [data, setData] = useState<TeamSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-read when the server says the team changed (rename, roster).
  const revision = useRealtimeRevision("team");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getTeamSettings();
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
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
  }, [revision]);

  async function leave() {
    setSaving(true);
    setError(null);

    try {
      await leaveTeam();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function rename(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      return false;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await renameTeam(trimmed);
      setData(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const updated = await removeTeamMember(memberId);
      setData(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    saving,
    error,
    leave,
    rename,
    removeMember,
  };
}
