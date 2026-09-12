/** Development-only API adapter. No backend or provider calls are made here. */
import type {
  FieldErrors,
  HelpRequest,
  RequestAction,
  Session,
} from "../../shared/types";
import { categoryOf, categoryTag, CATEGORIES } from "../../shared/requests";
import { validateDraft, validateJoin } from "../../shared/validation";
import type { ProblemDraft } from "../../shared/validation";
import type { RawResponse, Transport } from "../client";
import { createDb, type MockMember } from "./mockData";
const db = createDb();
const storageKey = "devsos.demo.session.v1";
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ok = (body: unknown): RawResponse => ({ status: 200, body });
const fail = (
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
): RawResponse => ({ status, body: { error: { code, message, fieldErrors } } });
const me = () => db.members.find((member) => member.id === db.currentMemberId);
const eventName = "HackStack Weekend";
for (const request of db.requests) {
  request.requesterId = id("seed-participant");
  request.category = categoryOf(request);
  if (request.mentorName) request.mentorId = "mem_sam";
}
db.members.push({
  id: "mem_sam",
  eventId: "evt_hackstack",
  displayName: "Sam (mentor)",
  role: "MENTOR",
  skills: ["UI", "React"],
  isAvailable: true,
});
function saveSession() {
  try {
    const member = me();
    if (member) sessionStorage.setItem(storageKey, JSON.stringify(member));
    else sessionStorage.removeItem(storageKey);
  } catch {
    /* Storage may be unavailable; session still works in memory. */
  }
}
try {
  const raw = sessionStorage.getItem(storageKey);
  if (raw) {
    const member = JSON.parse(raw) as MockMember;
    if (
      typeof member.id === "string" &&
      typeof member.displayName === "string" &&
      member.eventId === "evt_hackstack" &&
      ["PARTICIPANT", "MENTOR", "ORGANIZER"].includes(member.role)
    ) {
      if (!db.members.some((item) => item.id === member.id))
        db.members.push(member);
      db.currentMemberId = member.id;
    }
  }
} catch {
  /* Malformed demo state is ignored. Never used outside mock mode. */
}
function session(member: MockMember): Session {
  const event = db.events.find((item) => item.id === member.eventId)!;
  return {
    memberId: member.id,
    eventId: event.id,
    eventName,
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
function visible(request: HelpRequest, member: MockMember): HelpRequest {
  if (
    member.role === "ORGANIZER" ||
    request.requesterId === member.id ||
    request.mentorId === member.id
  )
    return { ...request };
  const {
    details: _details,
    codeSnippet: _snippet,
    attemptedSteps: _attempted,
    ...summary
  } = request;
  return summary;
}
function touch(request: HelpRequest) {
  request.version++;
  request.updatedAt = new Date().toISOString();
}
function route(
  method: string,
  path: string,
  body: any,
  headers: Record<string, string>,
): RawResponse {
  const url = new URL(path, "http://demo.local");
  const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const member = me();
  if (url.pathname === "/api/join" && method === "POST") {
    if (body?.eventCode?.trim().toUpperCase() === "SERVERERROR")
      return fail(503, "DEMO_FAILURE", "Demo server error.");
    const errors = validateJoin({
      eventCode: body?.eventCode ?? "",
      displayName: body?.displayName ?? "",
      role: body?.requestedRole ?? "PARTICIPANT",
      mentorInvite: body?.mentorInvite ?? "",
    });
    const event = db.events.find(
      (item) => item.code === String(body?.eventCode).trim().toUpperCase(),
    );
    if (!event)
      errors.eventCode =
        "That event code wasn't found. Check it with your organizer.";
    if (
      body?.requestedRole &&
      !["PARTICIPANT", "MENTOR"].includes(body.requestedRole)
    )
      errors.requestedRole = "Choose Participant or Mentor.";
    // An invitation, not a client-selected role, grants mentor access. Never grants organizer.
    const invite = String(body?.mentorInvite ?? "")
      .trim()
      .toUpperCase();
    if (invite && invite !== "MENTOR")
      errors.mentorInvite = "That mentor invitation is not valid.";
    if (Object.keys(errors).length)
      return fail(
        400,
        "VALIDATION",
        "Please check the highlighted fields.",
        errors,
      );
    if (event!.status === "CLOSED")
      return fail(403, "EVENT_CLOSED", "This event is closed.");
    const joined: MockMember = {
      id: id("member"),
      eventId: event!.id,
      displayName: body.displayName.trim(),
      role: invite === "MENTOR" ? "MENTOR" : "PARTICIPANT",
      tableLabel: body.tableLabel?.trim(),
      skills: [],
      isAvailable: invite === "MENTOR",
    };
    db.members.push(joined);
    db.currentMemberId = joined.id;
    saveSession();
    return ok(session(joined));
  }
  if (!member)
    return fail(401, "NO_SESSION", "Your session ended. Join the event again.");
  if (method !== "GET" && headers["X-CSRF-Token"] !== db.csrfToken)
    return fail(403, "CSRF", "Your session needs refreshing. Reload the page.");
  if (url.pathname === "/api/session") {
    if (method === "GET") return ok(session(member));
    if (method === "DELETE") {
      db.currentMemberId = null;
      saveSession();
      return { status: 204, body: null };
    }
  }
  if (seg[0] !== "api" || seg[1] !== "events")
    return fail(404, "NOT_FOUND", "Not found.");
  const event = db.events.find((item) => item.id === seg[2]);
  if (!event) return fail(404, "NOT_FOUND", "Event not found.");
  if (event.id !== member.eventId)
    return fail(403, "WRONG_EVENT", "You don't have access to this event.");
  if (seg.length === 3 && method === "GET")
    return ok({
      id: event.id,
      name: eventName,
      code: event.code,
      status: event.status,
    });
  if (seg[3] === "mentors" && method === "GET") {
    if (member.role !== "ORGANIZER")
      return fail(403, "FORBIDDEN", "Organizer access is required.");
    return ok(
      db.members
        .filter((item) => item.eventId === event.id && item.role === "MENTOR")
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          isAvailable: item.isAvailable,
          skills: item.skills,
          activeRequests: db.requests.filter(
            (r) =>
              r.mentorId === item.id &&
              ["CLAIMED", "IN_PROGRESS"].includes(r.status),
          ).length,
        })),
    );
  }
  if (seg[3] === "stats" && method === "GET") {
    if (member.role !== "ORGANIZER")
      return fail(403, "FORBIDDEN", "Organizer access is required.");
    const counts = {
      WAITING: 0,
      CLAIMED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CANCELLED: 0,
    };
    for (const r of db.requests.filter((r) => r.eventId === event.id))
      counts[r.status]++;
    return ok({
      eventId: event.id,
      counts,
      oldestWaiting: db.requests
        .filter((r) => r.eventId === event.id && r.status === "WAITING")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, 5)
        .map(({ id, title, createdAt }) => ({ id, title, createdAt })),
    });
  }
  if (event.status === "CLOSED" && method !== "GET")
    return fail(
      403,
      "EVENT_CLOSED",
      "The event is closed. Requests are read-only.",
    );
  if (seg.length === 3 && method === "PATCH") {
    if (member.role !== "ORGANIZER")
      return fail(403, "FORBIDDEN", "Organizer access is required.");
    if (body?.status !== "CLOSED")
      return fail(400, "VALIDATION", "Only closing is supported.");
    event.status = "CLOSED";
    return ok({ id: event.id, status: event.status });
  }
  if (seg[3] === "me" && method === "PATCH") {
    if (member.role !== "MENTOR")
      return fail(403, "FORBIDDEN", "Mentor access is required.");
    member.skills = body.skills ?? [];
    member.isAvailable = !!body.isAvailable;
    saveSession();
    return ok(session(member));
  }
  if (seg[3] === "assist" && method === "POST") {
    if (member.role !== "PARTICIPANT")
      return fail(403, "FORBIDDEN", "Participant access is required.");
    if (String(body.title).includes("[fail-ai]"))
      return fail(
        503,
        "ASSIST_UNAVAILABLE",
        "Assistance is temporarily unavailable.",
      );
    return ok({
      simulated: true,
      suggestions: [
        `Reduce this ${body.category} problem to the smallest reproducible example and compare the expected and actual behavior.`,
        "Inspect the first error and the values immediately before it. Change one thing at a time and rerun the example.",
        "Check configuration, versions and environment differences. Share the smallest failing example and exact error with a mentor if you're still blocked.",
      ],
      resources: [
        {
          title: "MDN: debugging JavaScript",
          url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_went_wrong",
        },
      ],
    });
  }
  if (seg[3] !== "requests") return fail(404, "NOT_FOUND", "Not found.");
  if (seg.length === 4 && method === "GET") {
    const list = db.requests
      .filter(
        (r) =>
          r.eventId === event.id &&
          (member.role !== "PARTICIPANT" || r.requesterId === member.id),
      )
      .filter(
        (r) =>
          !url.searchParams.get("status") ||
          r.status === url.searchParams.get("status"),
      )
      .filter(
        (r) =>
          !url.searchParams.get("tag") ||
          r.primaryTag === url.searchParams.get("tag"),
      );
    return ok(
      list
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => visible(r, member)),
    );
  }
  if (seg.length === 4 && method === "POST") {
    if (member.role !== "PARTICIPANT")
      return fail(403, "FORBIDDEN", "Only participants can submit requests.");
    const key = `${event.id}:${member.id}:${body?.clientRequestId}`;
    const previous = db.idempotency.get(key);
    if (previous) return ok({ ...db.requests.find((r) => r.id === previous)! });
    const errors = validateDraft(body as ProblemDraft);
    if (!body.clientRequestId)
      errors.clientRequestId = "A submission identifier is required.";
    if (!CATEGORIES.includes(body.category))
      errors.category = "Choose a category.";
    if (Object.keys(errors).length)
      return fail(
        400,
        "VALIDATION",
        "Please check the highlighted fields.",
        errors,
      );
    if (
      db.requests.some(
        (r) =>
          r.requesterId === member.id &&
          ["WAITING", "CLAIMED", "IN_PROGRESS"].includes(r.status),
      )
    )
      return fail(
        409,
        "ACTIVE_REQUEST",
        "You already have an active request. Open it from your dashboard.",
      );
    const now = new Date().toISOString();
    const request: HelpRequest = {
      id: id("request"),
      eventId: event.id,
      requesterId: member.id,
      requesterName: member.displayName,
      title: body.title.trim(),
      details: body.details.trim(),
      category: body.category,
      codeSnippet: body.codeSnippet || undefined,
      tableLabel: body.tableLabel.trim(),
      primaryTag: categoryTag[body.category as keyof typeof categoryTag],
      tags: [],
      status: "WAITING",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    db.requests.push(request);
    db.idempotency.set(key, request.id);
    return ok({ ...request });
  }
  const request = db.requests.find(
    (r) => r.id === seg[4] && r.eventId === event.id,
  );
  if (!request)
    return fail(404, "NOT_FOUND", "This request is no longer available.");
  const owner = request.requesterId === member.id;
  const assigned = request.mentorId === member.id;
  if (member.role === "PARTICIPANT" && !owner)
    return fail(
      403,
      "FORBIDDEN",
      "This request belongs to another participant.",
    );
  if (seg.length === 5 && method === "GET") return ok(visible(request, member));
  if (seg[5] === "actions" && method === "POST") {
    const action = body.action as RequestAction;
    if (
      member.role === "PARTICIPANT" &&
      !(owner && action === "cancel" && request.status === "WAITING")
    )
      return fail(
        403,
        "FORBIDDEN",
        "You can only cancel your own waiting request.",
      );
    if (
      member.role === "MENTOR" &&
      (action === "cancel" || (action !== "claim" && !assigned))
    )
      return fail(
        403,
        "FORBIDDEN",
        "Only the assigned mentor can update this request.",
      );
    if (request.version !== body.expectedVersion)
      return fail(
        409,
        "CONFLICT",
        "This request changed. Refresh and try again.",
      );
    const now = new Date().toISOString();
    if (action === "claim") {
      if (request.status !== "WAITING")
        return fail(409, "CONFLICT", "Another mentor took this request.");
      request.status = "CLAIMED";
      request.mentorId = member.id;
      request.mentorName = member.displayName;
      request.claimedAt = now;
      request.firstClaimedAt ??= now;
    } else if (action === "start" && request.status === "CLAIMED") {
      request.status = "IN_PROGRESS";
      request.startedAt = now;
    } else if (
      action === "resolve" &&
      (request.status === "IN_PROGRESS" ||
        (member.role === "ORGANIZER" &&
          ["WAITING", "CLAIMED"].includes(request.status)))
    ) {
      request.status = "RESOLVED";
      request.resolvedAt = now;
    } else if (
      action === "release" &&
      ["CLAIMED", "IN_PROGRESS"].includes(request.status)
    ) {
      request.status = "WAITING";
      delete request.mentorId;
      delete request.mentorName;
      delete request.claimedAt;
      delete request.startedAt;
    } else if (
      action === "cancel" &&
      ["WAITING", "CLAIMED", "IN_PROGRESS"].includes(request.status)
    ) {
      request.status = "CANCELLED";
      request.cancelledAt = now;
    } else return fail(409, "CONFLICT", "This request has already moved on.");
    touch(request);
    return ok(visible(request, member));
  }
  return fail(404, "NOT_FOUND", "Not found.");
}
export const mockTransport: Transport = async (method, path, body, headers) => {
  await sleep(180 + Math.random() * 220);
  return route(method, path, body, headers);
};
/** Adapter integration-test fixture only; never exposed by the Join UI. */
export function setMockIdentityForTest(memberId: string | null) {
  db.currentMemberId = memberId;
  saveSession();
}
