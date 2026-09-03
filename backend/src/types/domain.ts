/**
 * Shared domain primitives. These were previously re-declared in every
 * service file (`home`, `team`, `member`, `settings`) — keep the single
 * copy here.
 */

export type MemberStatus = "working" | "resting" | "offline";

/** The minimal member shape used across home / team / settings rosters. */
export type Member = {
  id: string;
  label: string;
  status: MemberStatus;
  /** Chosen avatar id ("cat" | "man" | "woman"), or null → client falls back. */
  avatar: string | null;
};

/** State of a bar in the team weekly chart. */
export type WeeklyBarState = "past" | "today" | "future";
