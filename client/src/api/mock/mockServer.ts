/**
 * In-memory stand-in for the real API. Same shapes, same status codes, same
 * error envelope. Enabled with VITE_USE_MOCK=true; nothing outside src/api/
 * knows it exists.
 */
import type {
  EventStats,
  FieldErrors,
  HelpRequest,
  RequestAction,
  RequestStatus,
  Role,
  Session,
  Tag,
} from "../../shared/types";
import { LIMITS, isTag, MAX_EXTRA_TAGS } from "../../shared/tags";
import type { RawResponse, Transport } from "../client";
import { createDb, nextId, type MockDb, type MockMember } from "./mockData";

const db: MockDb = createDb();

/** Lets the mock realtime layer mirror the server's content-free signals. */
type MockSignal = "queue.changed" | "stats.changed" | "mentor.changed";
const listeners = new Set<(signal: MockSignal, payload: unknown) => void>();

export function onMockSignal(fn: (signal: MockSignal, payload: unknown) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(signal: MockSignal, payload: unknown) {
  for (const fn of listeners) fn(signal, payload);
}

const latency = () => 120 + Math.random() * 380;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ok(body: unknown): RawResponse {
  return { status: 200, body };
}

function fail(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
): RawResponse {
  return {
    status,
    body: { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
  };
}

function me(): MockMember | null {
  return db.members.find((m) => m.id === db.currentMemberId) ?? null;
}

function toSession(member: MockMember): Session {
  const event = db.events.find((e) => e.id === member.eventId)!;
  return {
    memberId: member.id,
    eventId: member.eventId,
    eventCode: event.code,
    eventStatus: event.status,
    displayName: member.displayName,
    role: member.role,
    tableLabel: member.tableLabel,
    skills: member.skills,
    isAvailable: member.isAvailable,
    csrfToken: db.csrfToken,
  };
}

/**
 * What a member is allowed to see. Participants never read another team's
 * details text; a mentor sees full detail only once the request is theirs.
 */
function visible(req: HelpRequest, member: MockMember): HelpRequest {
  const isRequester = req.requesterName === member.displayName;
  const isAssignedMentor = req.mentorName === member.displayName;
  if (isRequester || isAssignedMentor || member.role === "ORGANIZER") {
    return { ...req };
  }
  const { details: _details, attemptedSteps: _attempted, ...rest } = req;
  return rest;
}

function touch(req: HelpRequest) {
  req.version += 1;
  req.updatedAt = new Date().toISOString();
  emit("queue.changed", {
    eventId: req.eventId,
    requestId: req.id,
    version: req.version,
  });
  emit("stats.changed", { eventId: req.eventId });
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function applyAction(
  req: HelpRequest,
  action: RequestAction,
  member: MockMember,
): RawResponse {
  const now = new Date().toISOString();
  switch (action) {
    case "claim":
      if (req.status !== "WAITING") {
        return fail(409, "CONFLICT", "Another mentor took this request");
      }
      req.status = "CLAIMED";
      req.mentorName = member.displayName;
      req.claimedAt = now;
      req.firstClaimedAt = req.firstClaimedAt ?? now;
      break;
    case "start":
      if (req.status !== "CLAIMED") {
        return fail(409, "CONFLICT", "This request has already moved on");
      }
      req.status = "IN_PROGRESS";
      req.startedAt = now;
      break;
    case "release":
      if (req.status !== "CLAIMED" && req.status !== "IN_PROGRESS") {
        return fail(409, "CONFLICT", "This request has already moved on");
      }
      req.status = "WAITING";
      delete req.mentorName;
      delete req.claimedAt;
      delete req.startedAt;
      break;
    case "resolve":
      if (req.status === "RESOLVED" || req.status === "CANCELLED") {
        return fail(409, "CONFLICT", "This request has already been closed");
      }
      req.status = "RESOLVED";
      req.resolvedAt = now;
      break;
    case "cancel":
      if (req.status === "RESOLVED" || req.status === "CANCELLED") {
        return fail(409, "CONFLICT", "This request has already been closed");
      }
      req.status = "CANCELLED";
      req.cancelledAt = now;
      break;
    default:
      return fail(400, "BAD_ACTION", "Unknown action");
  }
  touch(req);
  return ok(visible(req, member));
}

/** Requests with a claim in flight, so a simultaneous claim forces a 409. */
const claimsInFlight = new Set<string>();

function route(
  method: string,
  path: string,
  body: any,
  headers: Record<string, string>,
): RawResponse | Promise<RawResponse> {
  const [pathname = "", search = ""] = path.split("?");
  const seg = pathname.split("/").filter(Boolean); // api, events, :e, ...
  const query = new URLSearchParams(search);
  const member = me();

  if (method !== "GET" && pathname !== "/api/join") {
    if (headers["X-CSRF-Token"] !== db.csrfToken) {
      return fail(403, "CSRF", "Missing or invalid CSRF token");
    }
  }

  // POST /api/join
  if (pathname === "/api/join" && method === "POST") {
    const fieldErrors: FieldErrors = {};
    const eventCode = str(body?.eventCode).toUpperCase();
    const displayName = str(body?.displayName);
    const tableLabel = str(body?.tableLabel);
    const event = db.events.find((e) => e.code === eventCode);
    if (!eventCode) fieldErrors.eventCode = "Enter the event code.";
    else if (!event) fieldErrors.eventCode = "No event with that code.";
    if (
      displayName.length < LIMITS.displayName.min ||
      displayName.length > LIMITS.displayName.max
    ) {
      fieldErrors.displayName = `Use between ${LIMITS.displayName.min} and ${LIMITS.displayName.max} characters.`;
    }
    if (tableLabel.length > LIMITS.tableLabel.max) {
      fieldErrors.tableLabel = `Use at most ${LIMITS.tableLabel.max} characters.`;
    }
    if (Object.keys(fieldErrors).length) {
      return fail(400, "VALIDATION", "Please check the highlighted fields.", fieldErrors);
    }
    if (event!.status === "CLOSED") {
      return fail(403, "EVENT_CLOSED", "This event has been closed.");
    }

    const invite = str(body?.mentorInvite).toUpperCase();
    let role: Role = "PARTICIPANT";
    if (invite === "MENTOR") role = "MENTOR";
    else if (invite === "ORGANIZER") role = "ORGANIZER";
    else if (invite) {
      return fail(400, "VALIDATION", "Please check the highlighted fields.", {
        mentorInvite: "That invitation is not valid.",
      });
    }

    const newMember: MockMember = {
      id: nextId("mem"),
      eventId: event!.id,
      displayName,
      role,
      tableLabel: tableLabel || undefined,
      skills: [],
      isAvailable: role === "MENTOR",
    };
    db.members.push(newMember);
    db.currentMemberId = newMember.id;
    return ok(toSession(newMember));
  }

  // GET / DELETE /api/session
  if (pathname === "/api/session") {
    if (method === "GET") {
      if (!member) return fail(401, "NO_SESSION", "Not signed in");
      return ok(toSession(member));
    }
    if (method === "DELETE") {
      db.currentMemberId = null;
      return { status: 204, body: null };
    }
  }

  if (seg[0] !== "api" || seg[1] !== "events") {
    return fail(404, "NOT_FOUND", "Not found");
  }
  if (!member) return fail(401, "NO_SESSION", "Not signed in");

  const eventId = decodeURIComponent(seg[2] ?? "");
  const event = db.events.find((e) => e.id === eventId);
  if (!event) return fail(404, "NOT_FOUND", "Not found");
  // One event's data never appears in another event's view.
  if (member.eventId !== eventId) {
    return fail(403, "WRONG_EVENT", "You don't have permission for this action");
  }

  // PATCH /api/events/:e
  if (seg.length === 3 && method === "PATCH") {
    if (member.role !== "ORGANIZER") {
      return fail(403, "FORBIDDEN", "You don't have permission for this action");
    }
    if (body?.status !== "CLOSED") {
      return fail(400, "VALIDATION", "Please check the highlighted fields.", {
        status: "Only CLOSED is supported.",
      });
    }
    event.status = "CLOSED";
    emit("stats.changed", { eventId });
    emit("queue.changed", { eventId });
    return ok({ id: event.id, status: "CLOSED" });
  }

  // PATCH /api/events/:e/me
  if (seg[3] === "me" && method === "PATCH") {
    if (member.role !== "MENTOR") {
      return fail(403, "FORBIDDEN", "You don't have permission for this action");
    }
    const skills: Tag[] = Array.isArray(body?.skills)
      ? body.skills.filter((t: unknown): t is Tag => typeof t === "string" && isTag(t))
      : [];
    member.skills = skills;
    member.isAvailable = Boolean(body?.isAvailable);
    emit("mentor.changed", { eventId });
    return ok(toSession(member));
  }

  // GET /api/events/:e/stats
  if (seg[3] === "stats" && method === "GET") {
    if (member.role !== "ORGANIZER") {
      return fail(403, "FORBIDDEN", "You don't have permission for this action");
    }
    const counts: Record<RequestStatus, number> = {
      WAITING: 0,
      CLAIMED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CANCELLED: 0,
    };
    for (const r of db.requests) if (r.eventId === eventId) counts[r.status] += 1;
    const oldestWaiting = db.requests
      .filter((r) => r.eventId === eventId && r.status === "WAITING")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5)
      .map((r) => ({ id: r.id, title: r.title, createdAt: r.createdAt }));
    const stats: EventStats = { eventId, counts, oldestWaiting };
    return ok(stats);
  }

  if (seg[3] !== "requests") return fail(404, "NOT_FOUND", "Not found");

  // GET /api/events/:e/requests
  if (seg.length === 4 && method === "GET") {
    const status = query.get("status") as RequestStatus | null;
    const tag = query.get("tag") as Tag | null;
    const list = db.requests
      .filter((r) => r.eventId === eventId)
      .filter((r) => (status ? r.status === status : true))
      .filter((r) => (tag ? r.primaryTag === tag || r.tags.includes(tag) : true))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => visible(r, member));
    return ok(list);
  }

  // POST /api/events/:e/requests
  if (seg.length === 4 && method === "POST") {
    if (event.status === "CLOSED") {
      return fail(403, "EVENT_CLOSED", "This event has been closed.");
    }
    const clientRequestId = str(body?.clientRequestId);
    const existingId = db.idempotency.get(clientRequestId);
    if (existingId) {
      // A retry of the same submission, not a second request.
      const existing = db.requests.find((r) => r.id === existingId)!;
      return ok(visible(existing, member));
    }
    const title = str(body?.title);
    const details = str(body?.details);
    const attemptedSteps = str(body?.attemptedSteps);
    const tableLabel = str(body?.tableLabel);
    const primaryTag = str(body?.primaryTag);
    const extra: string[] = Array.isArray(body?.tags) ? body.tags.map(str) : [];

    const fieldErrors: FieldErrors = {};
    if (title.length < LIMITS.title.min || title.length > LIMITS.title.max) {
      fieldErrors.title = `Use between ${LIMITS.title.min} and ${LIMITS.title.max} characters.`;
    }
    if (details.length < LIMITS.details.min || details.length > LIMITS.details.max) {
      fieldErrors.details = `Use between ${LIMITS.details.min} and ${LIMITS.details.max} characters.`;
    }
    if (attemptedSteps.length > LIMITS.attemptedSteps.max) {
      fieldErrors.attemptedSteps = `Use at most ${LIMITS.attemptedSteps.max} characters.`;
    }
    if (!tableLabel || tableLabel.length > LIMITS.tableLabel.max) {
      fieldErrors.tableLabel = `Use between ${LIMITS.tableLabel.min} and ${LIMITS.tableLabel.max} characters.`;
    }
    if (!isTag(primaryTag)) fieldErrors.primaryTag = "Choose a primary topic.";
    const distinct = [...new Set(extra)].filter((t) => t !== primaryTag);
    if (distinct.length > MAX_EXTRA_TAGS || !distinct.every((t) => isTag(t))) {
      fieldErrors.tags = `Choose up to ${MAX_EXTRA_TAGS} extra topics.`;
    }
    if (Object.keys(fieldErrors).length) {
      return fail(400, "VALIDATION", "Please check the highlighted fields.", fieldErrors);
    }

    const now = new Date().toISOString();
    const created: HelpRequest = {
      id: nextId("req"),
      eventId,
      status: "WAITING",
      version: 1,
      title,
      primaryTag: primaryTag as Tag,
      tags: distinct as Tag[],
      tableLabel,
      requesterName: member.displayName,
      details,
      attemptedSteps: attemptedSteps || undefined,
      createdAt: now,
      updatedAt: now,
    };
    db.requests.push(created);
    if (clientRequestId) db.idempotency.set(clientRequestId, created.id);
    emit("queue.changed", { eventId, requestId: created.id, version: created.version });
    emit("stats.changed", { eventId });
    return ok(visible(created, member));
  }

  const requestId = decodeURIComponent(seg[4] ?? "");
  const req = db.requests.find((r) => r.id === requestId && r.eventId === eventId);

  // GET /api/events/:e/requests/:r
  if (seg.length === 5 && method === "GET") {
    if (!req) return fail(404, "NOT_FOUND", "This request is no longer available");
    return ok(visible(req, member));
  }

  // POST /api/events/:e/requests/:r/actions
  if (seg[5] === "actions" && method === "POST") {
    if (!req) return fail(404, "NOT_FOUND", "This request is no longer available");
    const action = str(body?.action) as RequestAction;
    const expectedVersion = body?.expectedVersion;
    if (typeof expectedVersion !== "number") {
      return fail(400, "VALIDATION", "Please check the highlighted fields.", {
        expectedVersion: "Missing expected version.",
      });
    }

    const mine = req.requesterName === member.displayName;
    const mentorOnly: RequestAction[] = ["claim", "start", "release"];
    if (member.role === "PARTICIPANT" && (mentorOnly.includes(action) || !mine)) {
      return fail(403, "FORBIDDEN", "You don't have permission for this action");
    }

    if (action === "claim") {
      // Forced conflict: a second claim arriving while the first is in flight.
      if (claimsInFlight.has(req.id)) {
        return fail(409, "CONFLICT", "Another mentor took this request");
      }
      claimsInFlight.add(req.id);
      return sleep(latency()).then(() => {
        claimsInFlight.delete(req.id);
        if (req.version !== expectedVersion) {
          return fail(409, "CONFLICT", "Another mentor took this request");
        }
        return applyAction(req, action, member);
      });
    }

    if (req.version !== expectedVersion) {
      return fail(409, "CONFLICT", "Another mentor took this request");
    }
    return applyAction(req, action, member);
  }

  return fail(404, "NOT_FOUND", "Not found");
}

export const mockTransport: Transport = async (method, path, body, headers) => {
  await sleep(latency());
  return route(method, path, body, headers);
};
