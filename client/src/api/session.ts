import type { Session, Tag } from "../shared/types";
import { api, setCsrfToken } from "./client";

export interface JoinInput {
  requestedRole?: "PARTICIPANT" | "MENTOR";
  eventCode: string;
  displayName: string;
  tableLabel?: string;
  /** Never logged, never persisted. */
  mentorInvite?: string;
}

export async function join(input: JoinInput): Promise<Session> {
  const session = await api.post<Session>("/api/join", input);
  setCsrfToken(session.csrfToken);
  return session;
}

export async function getSession(): Promise<Session> {
  const session = await api.get<Session>("/api/session");
  setCsrfToken(session.csrfToken);
  return session;
}

export async function logout(): Promise<void> {
  await api.del<void>("/api/session");
  setCsrfToken(null);
}

/** Mentor only. */
export function updateMe(
  eventId: string,
  patch: { skills: Tag[]; isAvailable: boolean },
): Promise<Session> {
  return api.patch<Session>(
    `/api/events/${encodeURIComponent(eventId)}/me`,
    patch,
  );
}
