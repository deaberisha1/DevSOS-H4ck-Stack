import { api } from "./client";
import type { ProblemDraft } from "../shared/validation";
export interface AssistResult {
  suggestions: string[];
  resources?: { title: string; url: string }[];
  simulated?: boolean;
}
// Proposed backend contract. Only the server may communicate with a model provider.
export function assist(
  eventId: string,
  draft: ProblemDraft,
): Promise<AssistResult> {
  return api.post(`/api/events/${encodeURIComponent(eventId)}/assist`, {
    title: draft.title,
    details: draft.details,
    category: draft.category,
    codeSnippet: draft.codeSnippet,
  });
}
export function safeResourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
