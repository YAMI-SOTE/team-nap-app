import { useState } from "react";

import { createTeam } from "@/services/team";

import type { TeamSettingsResponse } from "@/types/api";

/**
 * State + submit for the "チームをつくる" screen (S04-07). Mirrors the
 * shape of `useLogin` / `useSignUp`.
 */
export function useCreateTeam() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (): Promise<TeamSettingsResponse | null> => {
    if (!name.trim()) {
      setErrorMessage("チーム名を入力してください");
      return null;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      return await createTeam({ name: name.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorMessage(
        /409/.test(message)
          ? "すでにチームに参加しています"
          : "チームを作成できませんでした",
      );
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { name, setName, isSubmitting, errorMessage, submit };
}
