import type { EventStats } from "../shared/types";
import { api } from "./client";

/** Organizer only. */
export function getStats(eventId: string): Promise<EventStats> {
  return api.get<EventStats>(`/api/events/${encodeURIComponent(eventId)}/stats`);
}

/** Organizer only. */
export function closeEvent(eventId: string): Promise<{ id: string; status: "CLOSED" }> {
  return api.patch(`/api/events/${encodeURIComponent(eventId)}`, { status: "CLOSED" });
}
