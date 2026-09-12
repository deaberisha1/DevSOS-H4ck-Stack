import { api } from "./client";
import type { ProblemDraft } from "../shared/validation";
export interface AssistResult {
  suggestions: string[];
  resources?: { title: string; url: string }[];
  simulated?: boolean;
}

export interface AssistMessage {
  role: "user" | "agent";
  content: string;
}

export interface AssistReply extends AssistResult {
  reply: string;
  /** The agent thinks a mentor is now the better next step. */
  escalate?: boolean;
}

/**
 * A follow-up turn with the assistant. The whole conversation is sent each
 * time: the client keeps no model state, and only the server may talk to a
 * model provider.
 */
export function assistChat(
  eventId: string,
  input: { messages: AssistMessage[]; category: string },
): Promise<AssistReply> {
  return api.post(`/api/events/${encodeURIComponent(eventId)}/assist`, input);
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
