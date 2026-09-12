import type { EventStats } from "../shared/types";
import { api } from "./client";

/** Organizer only. */
export function getStats(eventId: string): Promise<EventStats> {
  return api.get<EventStats>(
    `/api/events/${encodeURIComponent(eventId)}/stats`,
  );
}

/** Organizer only. */
export function closeEvent(
  eventId: string,
): Promise<{ id: string; status: "CLOSED" }> {
  return api.patch(`/api/events/${encodeURIComponent(eventId)}`, {
    status: "CLOSED",
  });
}

export interface EventInfo {
  id: string;
  name: string;
  code: string;
  status: "OPEN" | "CLOSED";
}
export interface MentorInfo {
  id: string;
  displayName: string;
  isAvailable: boolean;
  activeRequests: number;
  skills: string[];
}
// Proposed additions; backend agreement pending (see API-HANDOFF.md).
export function getEvent(eventId: string): Promise<EventInfo> {
  return api.get(`/api/events/${encodeURIComponent(eventId)}`);
}
export function getMentors(eventId: string): Promise<MentorInfo[]> {
  return api.get(`/api/events/${encodeURIComponent(eventId)}/mentors`);
}
