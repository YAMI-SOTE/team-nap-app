import { useEffect, useState } from "react";

import { getTeamSettings, leaveTeam } from "@/services/settings";
import { renameTeam } from "@/services/team";

import type { TeamSettingsResponse } from "@/types/api";

export function useTeamSettings() {
  const [data, setData] = useState<TeamSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

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

  return {
    data,
    loading,
    saving,
    error,
    leave,
    rename,
  };
}
