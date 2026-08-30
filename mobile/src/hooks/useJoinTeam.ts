import { useState } from "react";

import { joinTeam } from "@/services/team";

import type { TeamSettingsResponse } from "@/types/api";

/**
 * State + submit for the "チームに参加" screen (S04-08). The invite code
 * is uppercased as the user types.
 */
export function useJoinTeam() {
  const [code, setCodeRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setCode = (value: string) => {
    // Invite codes are alphanumeric only — drop anything else as typed.
    setCodeRaw(value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
    if (errorMessage) setErrorMessage(null);
  };

  const submit = async (): Promise<TeamSettingsResponse | null> => {
    if (!code.trim()) {
      setErrorMessage("招待コードを入力してください");
      return null;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      return await joinTeam({ inviteCode: code.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (/404/.test(message)) {
        setErrorMessage("招待コードが正しくありません");
      } else if (/409/.test(message)) {
        setErrorMessage("すでにチームに参加しています");
      } else {
        setErrorMessage("チームに参加できませんでした");
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { code, setCode, isSubmitting, errorMessage, submit };
}
