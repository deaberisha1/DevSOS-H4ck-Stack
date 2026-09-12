import type { Session } from "./types";

/** Where a role lands when it opens the event root or a route it may not use. */
export function homePathFor(session: Session): string {
  const base = `/event/${encodeURIComponent(session.eventId)}`;
  if (session.role === "MENTOR") return `${base}/mentor`;
  if (session.role === "ORGANIZER") return `${base}/organizer`;
  return base;
}
