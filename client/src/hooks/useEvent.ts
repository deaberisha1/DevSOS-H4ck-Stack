import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actOnRequest, getRequest, listRequests } from "../api/requests";
import { getEvent, getMentors, getStats } from "../api/events";
import { createContext, useContext } from "react";
import type { HelpRequest, RequestAction, Session } from "../shared/types";
import { ApiError } from "../api/client";
export const EventSessionContext = createContext<Session | null>(null);
export function useEventSession() {
  const session = useContext(EventSessionContext);
  if (!session)
    throw new Error("Event screens must be inside the session guard.");
  return session;
}
export const eventKey = (eventId: string) => ["event", eventId] as const;
const live = {
  refetchInterval: 4000,
  refetchIntervalInBackground: false,
  retry: 1,
} as const;
export function useRequests() {
  const s = useEventSession();
  return useQuery<HelpRequest[], ApiError>({
    queryKey: [...eventKey(s.eventId), "requests", s.memberId, s.role],
    queryFn: () => listRequests(s.eventId),
    ...live,
  });
}
export function useRequest(requestId: string) {
  const s = useEventSession();
  return useQuery<HelpRequest, ApiError>({
    queryKey: [
      ...eventKey(s.eventId),
      "request",
      requestId,
      s.memberId,
      s.role,
    ],
    queryFn: () => getRequest(s.eventId, requestId),
    ...live,
  });
}
export function useEventInfo() {
  const s = useEventSession();
  return useQuery({
    queryKey: [...eventKey(s.eventId), "info"],
    queryFn: () => getEvent(s.eventId),
    ...live,
  });
}
export function useEventStats() {
  const s = useEventSession();
  return useQuery({
    queryKey: [...eventKey(s.eventId), "stats", s.memberId, s.role],
    queryFn: () => getStats(s.eventId),
    ...live,
  });
}
export function useMentors() {
  const s = useEventSession();
  return useQuery({
    queryKey: [...eventKey(s.eventId), "mentors", s.memberId, s.role],
    queryFn: () => getMentors(s.eventId),
    ...live,
  });
}
export function useRequestAction() {
  const s = useEventSession();
  const qc = useQueryClient();
  return useMutation<
    HelpRequest,
    ApiError,
    { request: HelpRequest; action: RequestAction }
  >({
    mutationFn: ({ request, action }) =>
      actOnRequest(s.eventId, request.id, action, request.version),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: eventKey(s.eventId) });
      void qc.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
