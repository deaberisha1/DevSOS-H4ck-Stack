import type { EventStatus, HelpRequest, Role, Tag } from "../../shared/types";

export interface MockMember {
  id: string;
  eventId: string;
  displayName: string;
  role: Role;
  tableLabel?: string;
  skills: Tag[];
  isAvailable: boolean;
}

export interface MockEvent {
  id: string;
  code: string;
  status: EventStatus;
}

export interface MockDb {
  events: MockEvent[];
  members: MockMember[];
  requests: HelpRequest[];
  /** The "session cookie": which member the mock browser is signed in as. */
  currentMemberId: string | null;
  csrfToken: string;
  /** clientRequestId -> request id, so a retried submit is not a duplicate. */
  idempotency: Map<string, string>;
}

const EVENT_ID = "evt_hackstack";

function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

let seq = 0;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq.toString().padStart(4, "0")}`;
}

function seedRequest(partial: Partial<HelpRequest> & Pick<HelpRequest, "title" | "primaryTag" | "requesterName" | "tableLabel">): HelpRequest {
  const created = partial.createdAt ?? minutesAgo(3);
  return {
    id: nextId("req"),
    eventId: EVENT_ID,
    status: "WAITING",
    version: 1,
    tags: [],
    details: "We have been stuck on this for a while and cannot see what is wrong.",
    attemptedSteps: "Restarted the dev server and re-read the docs.",
    createdAt: created,
    updatedAt: created,
    ...partial,
  } as HelpRequest;
}

export function createDb(): MockDb {
  return {
    events: [{ id: EVENT_ID, code: "HACKSTACK", status: "OPEN" }],
    members: [
      {
        id: "mem_organizer",
        eventId: EVENT_ID,
        displayName: "Ola (organizer)",
        role: "ORGANIZER",
        skills: [],
        isAvailable: true,
      },
    ],
    requests: [
      seedRequest({
        title: "useEffect runs twice and doubles our fetch",
        primaryTag: "React",
        tags: ["JavaScript"],
        requesterName: "Team Northstar",
        tableLabel: "B4",
        createdAt: minutesAgo(14), // over the 10 minute flag
      }),
      seedRequest({
        title: "Postgres connection refused from the container",
        primaryTag: "Database",
        tags: ["Backend", "Deployment"],
        requesterName: "Team Kernel Panic",
        tableLabel: "C2",
        createdAt: minutesAgo(6),
      }),
      seedRequest({
        title: "Merge conflict in package-lock we cannot resolve",
        primaryTag: "Git",
        tags: [],
        requesterName: "Team Semicolon",
        tableLabel: "A1",
        createdAt: minutesAgo(2),
      }),
      seedRequest({
        title: "Modal traps focus behind the overlay",
        primaryTag: "UI",
        tags: ["React"],
        requesterName: "Team Aria",
        tableLabel: "D7",
        status: "IN_PROGRESS",
        mentorName: "Sam (mentor)",
        createdAt: minutesAgo(21),
        firstClaimedAt: minutesAgo(18),
        claimedAt: minutesAgo(18),
        startedAt: minutesAgo(16),
        version: 3,
      }),
    ],
    currentMemberId: null,
    csrfToken: "mock-csrf-token",
    idempotency: new Map(),
  };
}
