import type { Tag } from "./types";

export const TAGS: readonly Tag[] = [
  "React",
  "JavaScript",
  "TypeScript",
  "Backend",
  "Database",
  "Deployment",
  "Git",
  "UI",
] as const;

export const MAX_EXTRA_TAGS = 2;

export function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

/** Field limits mirrored from the server. Never stricter than the server. */
export const LIMITS = {
  title: { min: 5, max: 100 },
  details: { min: 20, max: 1000 },
  attemptedSteps: { min: 0, max: 500 },
  displayName: { min: 2, max: 40 },
  tableLabel: { min: 1, max: 30 },
  eventCode: { min: 1, max: 40 },
} as const;

/** A request waiting longer than this is flagged in the mentor queue. */
export const LONG_WAIT_MS = 10 * 60 * 1000;
