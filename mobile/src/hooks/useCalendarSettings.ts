import { useEffect, useState } from "react";

import {
  connectDeviceCalendar,
  disconnectGoogleCalendar,
  getCalendarIntegration,
  syncGoogleCalendar,
} from "@/services/settings";
import {
  isGoogleAuthConfigured,
  linkGoogleAccount,
} from "@/services/googleAuth";

import type { CalendarIntegrationResponse } from "@/types/api";

export function useCalendarSettings() {
  const [data, setData] = useState<CalendarIntegrationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getCalendarIntegration();
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

  async function runAction(
    action: () => Promise<CalendarIntegrationResponse>,
  ) {
    setSaving(true);
    setError(null);

    try {
      const result = await action();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  /** Run the Google OAuth consent flow, then reload the integration row. */
  async function linkGoogle() {
    setSaving(true);
    setError(null);
    try {
      await linkGoogleAccount();
      setData(await getCalendarIntegration());
    } catch (err) {
      // A plain cancel isn't worth a red banner.
      if (err instanceof Error && err.name === "GoogleAuthCancelled") return;
      setError(err instanceof Error ? err.message : "連携に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return {
    data,
    loading,
    saving,
    error,
    /** Whether a Google client id is configured for this platform. */
    googleAuthAvailable: isGoogleAuthConfigured(),
    linkGoogle,
    syncNow: () => runAction(syncGoogleCalendar),
    disconnectGoogle: () => runAction(disconnectGoogleCalendar),
    connectDevice: () => runAction(connectDeviceCalendar),
  };
}
