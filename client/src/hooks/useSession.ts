import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { getSession, join, logout, type JoinInput } from "../api/session";
import type { Session } from "../shared/types";

export const sessionKey = ["session"] as const;

/**
 * The one source of truth for identity and role. A missing session is a
 * `null` value, not an error: guards redirect on it, and only a real failure
 * (network, 500) surfaces as an error state.
 */
export function useSession() {
  return useQuery<Session | null, ApiError>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await getSession();
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthenticated) return null;
        throw err;
      }
    },
    staleTime: 30_000,
    retry: (count, err) => !(err instanceof ApiError) || err.status >= 500 ? count < 1 : false,
  });
}

export function useJoin() {
  const qc = useQueryClient();
  return useMutation<Session, ApiError, JoinInput>({
    mutationFn: join,
    onSuccess: (session) => {
      qc.setQueryData(sessionKey, session);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: logout,
    onSuccess: () => {
      // Drop every cached event payload with the session it belonged to.
      qc.clear();
      qc.setQueryData(sessionKey, null);
    },
  });
}
