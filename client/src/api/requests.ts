import type { HelpRequest, RequestAction, RequestStatus, Tag } from "../shared/types";
import { api, toQuery } from "./client";

export interface QueueFilters {
  status?: RequestStatus;
  tag?: Tag;
}

export interface CreateRequestInput {
  /** Stable per submission attempt — the server de-duplicates on it. */
  clientRequestId: string;
  title: string;
  details: string;
  attemptedSteps?: string;
  primaryTag: Tag;
  tags: Tag[];
  tableLabel: string;
}

const base = (eventId: string) =>
  `/api/events/${encodeURIComponent(eventId)}/requests`;

export function listRequests(
  eventId: string,
  filters: QueueFilters = {},
): Promise<HelpRequest[]> {
  return api.get<HelpRequest[]>(
    base(eventId) + toQuery({ status: filters.status, tag: filters.tag }),
  );
}

export function getRequest(eventId: string, requestId: string): Promise<HelpRequest> {
  return api.get<HelpRequest>(`${base(eventId)}/${encodeURIComponent(requestId)}`);
}

export function createRequest(
  eventId: string,
  input: CreateRequestInput,
): Promise<HelpRequest> {
  return api.post<HelpRequest>(base(eventId), input);
}

/** The server rejects a stale expectedVersion with 409. */
export function actOnRequest(
  eventId: string,
  requestId: string,
  action: RequestAction,
  expectedVersion: number,
): Promise<HelpRequest> {
  return api.post<HelpRequest>(
    `${base(eventId)}/${encodeURIComponent(requestId)}/actions`,
    { action, expectedVersion },
  );
}
