import { useEffect, useState } from "react";

import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/settings";

import type { NotificationSettingsResponse } from "@/types/api";

export function useNotificationSettings() {
  const [data, setData] = useState<NotificationSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getNotificationSettings();
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

  async function setNotification(
    key: keyof NotificationSettingsResponse,
    value: boolean,
  ) {
    if (!data) {
      return;
    }

    const previous = data;
    const optimistic = { ...data, [key]: value };
    setData(optimistic);
    setSaving(true);
    setError(null);

    try {
      const result = await updateNotificationSettings({ [key]: value });
      setData(result);
    } catch (err) {
      setData(previous);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    saving,
    error,
    setNotification,
  };
}
