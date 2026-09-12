export type RequestStatus =
  "WAITING" | "CLAIMED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";

export type Role = "PARTICIPANT" | "MENTOR" | "ORGANIZER";
export type Category = "Frontend" | "Backend" | "Git" | "Deployment" | "Other";

export type Tag =
  | "Other"
  | "React"
  | "JavaScript"
  | "TypeScript"
  | "Backend"
  | "Database"
  | "Deployment"
  | "Git"
  | "UI";

export interface HelpRequest {
  requesterId?: string;
  mentorId?: string;
  category?: Category;
  codeSnippet?: string;
  id: string;
  eventId: string;
  status: RequestStatus;
  version: number;
  title: string;
  primaryTag: Tag;
  tags: Tag[];
  tableLabel: string;
  requesterName: string;
  mentorName?: string;
  details?: string; // only present when the server allows it
  attemptedSteps?: string;
  createdAt: string; // UTC ISO
  updatedAt: string;
  firstClaimedAt?: string;
  claimedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  cancelledAt?: string;
}

export type RequestAction =
  "claim" | "start" | "release" | "resolve" | "cancel";

export type EventStatus = "OPEN" | "CLOSED";

/** GET /api/session */
export interface Session {
  eventName?: string;
  memberId: string;
  eventId: string;
  eventCode: string;
  eventStatus: EventStatus;
  displayName: string;
  role: Role;
  tableLabel?: string;
  skills?: Tag[];
  isAvailable?: boolean;
  csrfToken: string;
}

/** GET /api/events/:e/stats (organizer only) */
export interface EventStats {
  eventId: string;
  counts: Record<RequestStatus, number>;
  oldestWaiting: Array<{ id: string; title: string; createdAt: string }>;
}

export interface FieldErrors {
  [field: string]: string;
}

/** Every error response body: { error: { code, message, fieldErrors? } } */
export interface ApiErrorBody {
  error: { code: string; message: string; fieldErrors?: FieldErrors };
}
