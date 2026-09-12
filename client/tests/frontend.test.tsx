import { test, after } from "node:test";
import assert from "node:assert/strict";
import { act } from "react";
import { createRoot } from "react-dom/client";
import App, { queryClient } from "../src/App";
import { join, getSession, logout } from "../src/api/session";
import {
  createRequest,
  listRequests,
  getRequest,
  actOnRequest,
} from "../src/api/requests";
import { getStats, getMentors, closeEvent } from "../src/api/events";
import { assist, safeResourceUrl } from "../src/api/assist";
import { ApiError, setTransport } from "../src/api/client";
import {
  mockTransport,
  setMockIdentityForTest,
} from "../src/api/mock/mockServer";
import { validateDraft, validateJoin } from "../src/shared/validation";
import type { ProblemDraft } from "../src/shared/validation";

setTransport(mockTransport);
queryClient.setDefaultOptions({
  queries: { retry: false, gcTime: 0 },
  mutations: { retry: false, gcTime: 0 },
});
const draft: ProblemDraft = {
  title: "Backend authentication is failing",
  details: "Our API returns 401 in the browser but works in the terminal.",
  category: "Backend",
  codeSnippet: 'fetch("/api/demo")',
  tableLabel: "B4",
};
const payload = (suffix: string) => ({
  ...draft,
  clientRequestId: suffix,
  primaryTag: "Backend" as const,
  tags: [],
});
const rejectsStatus = (status: number) => (error: unknown) =>
  error instanceof ApiError && error.status === status;

test("adapter: participant privacy, idempotency, AI, mentor conflicts and authorized organizer", async () => {
  assert.equal(Object.keys(validateDraft(draft)).length, 0);
  assert.ok(validateDraft({ ...draft, title: "x" }).title);
  assert.ok(
    validateJoin({
      eventCode: "",
      displayName: "x",
      role: "MENTOR",
      mentorInvite: "",
    }).mentorInvite,
  );
  await assert.rejects(
    () => join({ eventCode: "wrong", displayName: "Taylor" }),
    rejectsStatus(400),
  );
  await assert.rejects(
    () => join({ eventCode: "SERVERERROR", displayName: "Taylor" }),
    rejectsStatus(503),
  );
  await assert.rejects(
    () =>
      join({
        eventCode: "HACKSTACK",
        displayName: "Intruder",
        mentorInvite: "ORGANIZER",
      }),
    rejectsStatus(400),
  );
  const participant = await join({
    eventCode: "HACKSTACK",
    displayName: "Taylor",
    requestedRole: "PARTICIPANT",
  });
  assert.equal((await getSession()).memberId, participant.memberId);
  assert.equal(
    JSON.parse(sessionStorage.getItem("devsos.demo.session.v1")!).id,
    participant.memberId,
  );
  const request = await createRequest(participant.eventId, payload("stable-1"));
  assert.equal(
    (await createRequest(participant.eventId, payload("stable-1"))).id,
    request.id,
  );
  assert.equal((await listRequests(participant.eventId)).length, 1);
  await assert.rejects(
    () => createRequest(participant.eventId, payload("second-active")),
    rejectsStatus(409),
  );
  await assert.rejects(() => getStats(participant.eventId), rejectsStatus(403));
  const result = await assist(participant.eventId, draft);
  assert.equal(result.simulated, true);
  assert.equal(result.suggestions.length, 3);
  await assert.rejects(
    () => assist(participant.eventId, { ...draft, title: "[fail-ai] request" }),
    rejectsStatus(503),
  );
  assert.equal(safeResourceUrl("javascript:alert(1)"), null);
  assert.equal(safeResourceUrl("https://example.com/"), "https://example.com/");
  const stored = sessionStorage.getItem("devsos.demo.session.v1")!;
  assert.ok(!stored.includes("fetch"));
  assert.ok(!stored.includes("mentorInvite"));
  await logout();
  await assert.rejects(getSession, rejectsStatus(401));
  const other = await join({
    eventCode: "HACKSTACK",
    displayName: "Taylor",
    requestedRole: "PARTICIPANT",
  });
  assert.notEqual(other.memberId, participant.memberId);
  assert.equal((await listRequests(other.eventId)).length, 0);
  await assert.rejects(
    () => getRequest(other.eventId, request.id),
    rejectsStatus(403),
  );
  await assert.rejects(
    () => actOnRequest(other.eventId, request.id, "cancel", 1),
    rejectsStatus(403),
  );
  const mentor = await join({
    eventCode: "HACKSTACK",
    displayName: "Morgan",
    requestedRole: "MENTOR",
    mentorInvite: "MENTOR",
  });
  assert.equal(mentor.role, "MENTOR");
  assert.equal(
    (await getRequest(mentor.eventId, request.id)).details,
    undefined,
  );
  const claims = await Promise.allSettled([
    actOnRequest(mentor.eventId, request.id, "claim", 1),
    actOnRequest(mentor.eventId, request.id, "claim", 1),
  ]);
  assert.equal(claims.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = claims.find(
    (item) => item.status === "rejected",
  ) as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 409);
  let claimed = await getRequest(mentor.eventId, request.id);
  assert.equal(claimed.codeSnippet, draft.codeSnippet);
  const another = await join({
    eventCode: "HACKSTACK",
    displayName: "Morgan",
    requestedRole: "MENTOR",
    mentorInvite: "MENTOR",
  });
  assert.notEqual(another.memberId, mentor.memberId);
  await assert.rejects(
    () => actOnRequest(another.eventId, request.id, "start", claimed.version),
    rejectsStatus(403),
  );
  setMockIdentityForTest(mentor.memberId);
  await getSession();
  claimed = await actOnRequest(
    mentor.eventId,
    request.id,
    "start",
    claimed.version,
  );
  const resolved = await actOnRequest(
    mentor.eventId,
    request.id,
    "resolve",
    claimed.version,
  );
  assert.equal(resolved.status, "RESOLVED");
  setMockIdentityForTest(participant.memberId);
  await getSession();
  const waiting = await createRequest(
    participant.eventId,
    payload("cancel-me"),
  );
  assert.equal(
    (
      await actOnRequest(
        participant.eventId,
        waiting.id,
        "cancel",
        waiting.version,
      )
    ).status,
    "CANCELLED",
  );
  setMockIdentityForTest("mem_organizer");
  await getSession();
  assert.ok((await getStats(participant.eventId)).counts.RESOLVED >= 1);
  assert.ok((await getMentors(participant.eventId)).length >= 3);
  await logout();
});

let root: ReturnType<typeof createRoot> | undefined;
async function mount(path: string, identity: string | null = null) {
  if (root) await act(async () => root!.unmount());
  queryClient.clear();
  setMockIdentityForTest(identity);
  window.history.replaceState({}, "", path);
  root = createRoot(document.getElementById("root")!);
  await act(async () => root!.render(<App />));
}
async function waitFor(
  predicate: () => boolean,
  label: string,
  timeout = 5000,
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  }
  assert.fail(`${label}: ${document.body.textContent?.slice(0, 1200)}`);
}
async function fill(id: string, value: string) {
  const element = document.getElementById(id) as
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  assert.ok(element, `Missing field ${id}`);
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
async function clickText(text: string, selector = "button") {
  const element = [...document.querySelectorAll<HTMLElement>(selector)].find(
    (el) => el.textContent?.trim() === text,
  );
  assert.ok(element, `Missing ${selector}: ${text}`);
  await act(async () => element.click());
}
const has = (text: string) =>
  document.body.textContent?.includes(text) || false;

test("DOM: participant joins, validates, uses AI, submits once, views and cancels", async () => {
  await mount("/join?code=HACKSTACK");
  await waitFor(() => !!document.getElementById("eventCode"), "join form");
  assert.equal(
    (document.getElementById("eventCode") as HTMLInputElement).value,
    "HACKSTACK",
  );
  await clickText("Join event");
  assert.ok(document.getElementById("displayName-error"));
  await fill("displayName", "UI Participant");
  queryClient.setQueryData(["event", "evt_hackstack", "old-identity"], {
    details: "A previous member's private draft",
  });
  await clickText("Join event");
  await waitFor(
    () => has("No blockers on the board."),
    "participant empty state",
  );
  assert.equal(
    queryClient.getQueryData(["event", "evt_hackstack", "old-identity"]),
    undefined,
  );
  await clickText("Ask for help", "a");
  await waitFor(() => !!document.getElementById("title"), "request form");
  await clickText("Ask a mentor");
  assert.ok(document.getElementById("title-error"));
  await fill("title", "[fail-ai] Broken browser authentication");
  await fill("details", draft.details);
  await fill("tableLabel", "C8");
  await fill("category", "Backend");
  await fill("codeSnippet", draft.codeSnippet);
  await clickText("Try AI help");
  await waitFor(() => has("Something went wrong on the server"), "AI failure");
  await fill("title", "Broken browser authentication");
  await clickText("Try AI help");
  await waitFor(() => has("Things to try"), "AI results");
  assert.ok(has("Simulated AI responses"));
  assert.equal(
    (document.getElementById("codeSnippet") as HTMLTextAreaElement).value,
    draft.codeSnippet,
  );
  const send = [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (el) => el.textContent?.startsWith("Ask a mentor"),
  )!;
  await act(async () => {
    send.click();
    send.click();
  });
  await waitFor(
    () => has("No mentor assigned") && has("The problem"),
    "request details",
  );
  assert.ok(has(draft.codeSnippet));
  assert.ok(has("Submitted"));
  assert.equal((await listRequests("evt_hackstack")).length, 1);
  await clickText("Cancel request");
  await waitFor(() => has("Cancelled"), "cancelled status");
  assert.equal(document.querySelectorAll("button").length > 0, true);
  await clickText("Leave event");
  await waitFor(
    () => !!document.getElementById("eventCode"),
    "leave clears session",
  );
  assert.equal(sessionStorage.getItem("devsos.demo.session.v1"), null);
});

test("DOM: AI help can finish without submission and direct mentor submission needs no AI", async () => {
  await mount("/join?code=HACKSTACK");
  await waitFor(() => !!document.getElementById("displayName"), "join form");
  await fill("displayName", "AI Participant");
  await clickText("Join event");
  await waitFor(() => has("No blockers on the board."), "empty dashboard");
  await clickText("Ask for help", "a");
  await fill("title", "Deployment fails on the final step");
  await fill("details", draft.details);
  await fill("tableLabel", "C9");
  await clickText("Try AI help");
  await waitFor(() => has("Things to try"), "AI suggestions");
  await clickText("This helped");
  await waitFor(
    () => has("No mentor request was created."),
    "AI success acknowledgement",
  );
  assert.equal((await listRequests("evt_hackstack")).length, 0);
  await clickText("Ask for help", "a");
  await fill("title", "A different blocker needs a mentor");
  await fill("details", draft.details);
  await fill("tableLabel", "C9");
  await clickText("Ask a mentor");
  await waitFor(() => has("The problem"), "direct submission");
  assert.equal((await listRequests("evt_hackstack")).length, 1);
  await clickText("Leave event");
  await waitFor(() => !!document.getElementById("eventCode"), "leave event");
});

test("DOM: mentor joins, filters, claims, starts and resolves from My requests", async () => {
  await mount("/join?code=HACKSTACK");
  await waitFor(() => !!document.getElementById("displayName"), "mentor join");
  await fill("displayName", "UI Mentor");
  const radio = document.querySelector<HTMLInputElement>(
    'input[value="MENTOR"]',
  )!;
  await act(async () => radio.click());
  await fill("mentorInvite", "MENTOR");
  await clickText("Join event");
  await waitFor(() => has("Claim request"), "waiting queue");
  const search = document.querySelector<HTMLInputElement>(
    'input[type="search"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, "NO SUCH REQUEST");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.ok(has("No matching requests."));
  await clickText("Clear filters");
  let conflict = true;
  setTransport(async (method, path, body, headers) => {
    if (conflict && method === "POST" && path.endsWith("/actions")) {
      conflict = false;
      return {
        status: 409,
        body: {
          error: {
            code: "CONFLICT",
            message:
              "Another mentor took this request. The queue has refreshed.",
          },
        },
      };
    }
    return mockTransport(method, path, body, headers);
  });
  await clickText("Claim request");
  await waitFor(
    () => has("Another mentor took this request"),
    "friendly claim conflict",
  );
  await clickText("Claim request");
  await waitFor(() => has("Request updated."), "claim success");
  setTransport(mockTransport);
  await clickText("My requests");
  await waitFor(() => has("Start helping"), "my assignment");
  await clickText("Start helping");
  await waitFor(() => has("Resolve request"), "in progress action");
  await clickText("Resolve request");
  await waitFor(() => has("Resolved"), "resolved card");
  const requestLink =
    document.querySelector<HTMLAnchorElement>("article h2 a")!;
  await act(async () => requestLink.click());
  await waitFor(() => has("The problem"), "mentor details");
  assert.ok(has("Mentor: UI Mentor"));
  await clickText("Leave event");
  await waitFor(() => !!document.getElementById("eventCode"), "mentor leave");
});

test("DOM: protected organizer route redirects signed-out user to join", async () => {
  await mount("/event/evt_hackstack/organizer");
  await waitFor(
    () => !!document.getElementById("eventCode"),
    "protected route redirect",
  );
  assert.equal(window.location.pathname, "/join");
});

test("DOM: authorized organizer sees roster, copies link and closes event", async () => {
  await mount("/event/evt_hackstack/organizer", "mem_organizer");
  await waitFor(
    () => has("Mentor overview") && has("UI Mentor"),
    "organizer roster",
  );
  assert.ok(has("HackStack Weekend"));
  await waitFor(() => has("Total requests"), "organizer totals");
  await clickText("Copy link");
  assert.ok(has("Join link copied."));
  assert.equal(
    (globalThis as any).copiedText,
    "http://localhost:5173/join?code=HACKSTACK",
  );
  await clickText("Close event");
  assert.ok(has("Keep event open"));
  await clickText("Yes, close event");
  await waitFor(
    () => has("This event is closed. Requests are read-only."),
    "closed event state",
  );
  await act(async () => {
    await assert.rejects(
      () => createRequest("evt_hackstack", payload("closed")),
      rejectsStatus(403),
    );
  });
});

after(async () => {
  if (root) await act(async () => root!.unmount());
  queryClient.clear();
  window.close();
});
