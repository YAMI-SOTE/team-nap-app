import { useEffect, useState } from "react";

import {
  getAccountSettings,
  updateAccountSettings,
} from "@/services/settings";

import type { AccountSettingsResponse } from "@/types/api";

export function useAccountSettings() {
  const [data, setData] = useState<AccountSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getAccountSettings();
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
  }, []);

  async function save(next: AccountSettingsResponse) {
    setSaving(true);
    setError(null);

    try {
      const result = await updateAccountSettings(next);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    saving,
    error,
    save,
  };
}
