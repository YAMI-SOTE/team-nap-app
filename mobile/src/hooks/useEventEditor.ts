import { useEffect, useState } from "react";

import { deleteEvent, getEvent, saveEvent } from "@/services/schedule";
import { toISODate } from "@/utils/date";

import type { EventDraft } from "@/types/api";

function blankDraft(): EventDraft {
  return {
    title: "",
    date: toISODate(new Date()),
    start: "10:00",
    end: "11:00",
    allDay: false,
  };
}

/**
 * Backs the "予定を追加 / 予定を編集" screen. With an `id` it loads the
 * existing event; without one it starts from a blank draft.
 */
export function useEventEditor(id: string | undefined) {
  const isEdit = !!id;
  const [initial, setInitial] = useState<EventDraft | null>(
    isEdit ? null : blankDraft(),
  );
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInitial(blankDraft());
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getEvent(id)
      .then((event) => {
        if (active) {
          setInitial(event);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function save(draft: EventDraft): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      await saveEvent({ ...draft, id });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<boolean> {
    if (!id) {
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteEvent(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { initial, loading, saving, error, save, remove, isEdit };
}
