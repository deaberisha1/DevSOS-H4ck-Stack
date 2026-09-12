import type { EventStats, RequestStatus } from "../shared/types";
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

export interface ParticipantInfo {
  id: string;
  displayName: string;
  tableLabel?: string;
  joinedAt?: string;
  totalRequests: number;
  resolvedRequests: number;
  /** The one request they currently have open, if any. */
  activeRequest?: {
    id: string;
    title: string;
    status: RequestStatus;
    createdAt: string;
    mentorName?: string;
  };
}

/** Organizer only: everyone who has joined this event as a participant. */
export function getParticipants(eventId: string): Promise<ParticipantInfo[]> {
  return api.get(`/api/events/${encodeURIComponent(eventId)}/participants`);
}
