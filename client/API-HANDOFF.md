# DevSOS frontend API handoff

Branch: `frontend`. This change contains frontend code only. No backend, schema, secret or homepage design changes.

## Existing transport and contracts

The frontend retains the existing `src/api/client.ts` transport: same-origin JSON, `credentials: include`, in-memory CSRF token from the session, and `X-CSRF-Token` on mutations. HTTP failures use `{ error: { code, message, fieldErrors? } }`. Requests time out after 15 seconds. Backend authorization remains mandatory on every route and action.

Existing wrappers are reused:

- `POST /api/join` → Session
- `GET /api/session` → Session; 401 means signed out
- `DELETE /api/session` → 204
- `GET /api/events/:e/requests` → HelpRequest[] (participants must receive only their own requests)
- `POST /api/events/:e/requests` → HelpRequest
- `GET /api/events/:e/requests/:r` → HelpRequest with detail visibility enforced by server
- `POST /api/events/:e/requests/:r/actions` with `{ action, expectedVersion }` → updated HelpRequest
- `PATCH /api/events/:e/me` with `{ skills, isAvailable }` → Session
- `GET /api/events/:e/stats` → `{ eventId, counts, oldestWaiting }`
- `PATCH /api/events/:e` with `{ status: "CLOSED" }`

Existing TypeScript shapes live in `src/shared/types.ts` and `src/api/*.ts`. Existing endpoint availability has not been verified against the teammates' backend.

## Proposed additions — PENDING BACKEND AGREEMENT

1. Join accepts `requestedRole: "PARTICIPANT" | "MENTOR"` alongside existing eventCode, displayName, optional tableLabel and mentorInvite. This is a UI request only. Backend returns the actual authorized Session.role. Mentor selection requires an invitation in the current frontend. There is no organizer option. Organizer sessions must be provisioned through the existing trusted backend authentication process.
2. Session adds optional `eventName`. Requests add `requesterId`, optional `mentorId`, `category`, and optional `codeSnippet`. IDs are required for ownership actions in the new UI; display names are not used to determine permissions. Participant lists must be server-filtered; client filtering is not authorization.
3. Request creation sends the existing clientRequestId/title/details/primaryTag/tags/tableLabel plus `category` and optional `codeSnippet`. Categories: Frontend, Backend, Git, Deployment, Other. Legacy tags are retained for compatibility: Frontend → UI, Backend → Backend, Git → Git, Deployment → Deployment, Other → new Other tag. Backend must agree to the Other tag and preserve category/snippet. Legacy returned requests lacking category are normalized for display; this does not change stored data. Maximums: title 100 (min 5), details 1000 (min 20), snippet 5000, table 30 (min 1).
4. `GET /api/events/:e` → `{ id, name, code, status: "OPEN" | "CLOSED" }`, authorized event members only. Session event name/code is the fallback if unavailable; UI shows a retry notice.
5. `GET /api/events/:e/mentors` → `[{ id, displayName, isAvailable, activeRequests, skills: string[] }]`, organizer only. No fabricated roster is shown in real mode when unavailable.
6. `POST /api/events/:e/assist` body `{ title, details, category, codeSnippet? }` → `{ suggestions: string[], resources?: [{ title, url }], simulated?: boolean }`. Participant-only, backend-owned provider calls. Return up to three practical suggestions; UI caps at three and permits only http(s) resource links. AI failure does not block direct mentor submission. No provider keys or direct model SDKs in frontend.

Authorization/transition requirements: participant may cancel only their own WAITING request; mentor may claim WAITING, start assigned CLAIMED, resolve assigned IN_PROGRESS, release assigned CLAIMED/IN_PROGRESS. Organizer may manage active requests. Reject stale versions/competing claims with 409. Enforce one active participant request and idempotency scoped to event + requester + clientRequestId. Closing events blocks all request mutations. Request detail/code snippet privacy must be enforced by backend.

## Development mode and verification

One explicit switch: `VITE_USE_MOCK=true` in local development (`import.meta.env.DEV` is also required). Production builds always use HTTP; there is no fallback to mocks when real endpoints fail. Existing `.env` files were not changed. `.env.example` documents the switch. Start from `client` with `npm run dev`.

Demo event: HACKSTACK. Mentor invitation: MENTOR. Join code SERVERERROR simulates a server error; any unknown code simulates invalid code. Put `[fail-ai]` in a request title to simulate AI failure. All mock requests have simulated latency. Only the current demo identity is stored in sessionStorage; drafts, request contents, invitations and real credentials are not persisted. Reloading resets demo requests; the session survives the reload within the tab. Demo state is isolated per tab.

Organizer testing uses the adapter-only `setMockIdentityForTest("mem_organizer")` fixture. It is not reachable through Join Event and has no effect in production. A real organizer route needs a backend-authorized session.

No active real-time implementation was present. Event queries poll every four seconds while observed and visible, with background polling disabled; React Query cleans up observers/timers on unmount. Session polling also detects expiry/role/event closure. The installed socket library was not given invented event contracts.

There is no event creation endpoint in this repository, so no creation form was added. The organizer's existing session determines the event.

## Frontend checks

From `client`: `npm run typecheck`, `npm run build`, `npm test`. The test runner uses development-only esbuild and jsdom dependencies. Six integration/DOM tests cover validation, privacy, idempotency, AI failure/success/direct submission, session isolation, participant cancellation, mentor transitions/conflicts, route protection, and organizer copy/close actions. No lint script is configured in the existing project. The connected browser was unavailable, so these checks do not constitute a screenshot-based visual review or verification against a running backend.
