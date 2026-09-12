import type { RequestAction, RequestStatus, Role } from "./types";

/** Status shown as text, never colour alone. */
export const STATUS_LABEL: Record<RequestStatus, string> = {
  WAITING: "Waiting",
  CLAIMED: "Claimed",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

export const ACTION_LABEL: Record<RequestAction, string> = {
  claim: "I can help",
  start: "Start helping",
  release: "Release",
  resolve: "Resolve",
  cancel: "Cancel",
};

const ACTIVE: readonly RequestStatus[] = ["WAITING", "CLAIMED", "IN_PROGRESS"];

export function isActive(status: RequestStatus): boolean {
  return ACTIVE.includes(status);
}

/**
 * Which actions to OFFER for a status and role. This decides what a button
 * looks like, never whether the action is allowed: the server owns that and
 * rejects anything stale via expectedVersion.
 */
export function offeredActions(
  status: RequestStatus,
  role: Role,
  opts: { isMine?: boolean } = {},
): RequestAction[] {
  if (!isActive(status)) return [];
  if (role === "PARTICIPANT") {
    return opts.isMine === false ? [] : status === "IN_PROGRESS" ? ["resolve", "cancel"] : ["cancel"];
  }
  if (role === "MENTOR") {
    if (status === "WAITING") return ["claim"];
    if (!opts.isMine) return [];
    if (status === "CLAIMED") return ["start", "release"];
    return ["resolve", "release"];
  }
  // Organizer oversees every active request.
  if (status === "WAITING") return ["cancel"];
  return ["release", "resolve", "cancel"];
}
