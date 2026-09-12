import { Link, useSearchParams } from "react-router-dom";
import { useEventSession, useRequests } from "../hooks/useEvent";
import { useNow } from "../hooks/useMotion";
import {
  Alert,
  Loading,
  RequestActions,
  Status,
  css,
} from "../components/event/UI";
import {
  categoryOf,
  dateTime,
  elapsed,
  statusText,
} from "../shared/requests";
import type { HelpRequest } from "../shared/types";
import {
  IconArrowRight,
  IconCheck,
  IconClock,
  IconHandRaised,
  IconPen,
  IconBrain,
  IconPlus,
  IconTable,
  IconUsers,
} from "../components/icons";
import own from "./ParticipantHome.module.css";

const ACTIVE = ["WAITING", "CLAIMED", "IN_PROGRESS"];
const LONG_WAIT_MS = 10 * 60_000;

/** The three steps a participant actually watches for. */
function Track({ request }: { request: HelpRequest }) {
  const steps = [
    {
      key: "WAITING",
      label: "In the queue",
      hint: "Mentors can see it",
      done: true,
    },
    {
      key: "CLAIMED",
      label: "Mentor on the way",
      hint: request.mentorName ? `${request.mentorName} is coming` : "Waiting for a mentor",
      done: request.status === "CLAIMED" || request.status === "IN_PROGRESS",
    },
    {
      key: "IN_PROGRESS",
      label: "Working on it",
      hint: "At your table",
      done: request.status === "IN_PROGRESS",
    },
  ];
  const currentIndex = steps.map((s) => s.done).lastIndexOf(true);

  return (
    <ol className={own.track}>
      {steps.map((step, i) => (
        <li
          key={step.key}
          className={
            i === currentIndex ? own.trackNow : step.done ? own.trackDone : undefined
          }
          aria-current={i === currentIndex ? "step" : undefined}
        >
          {step.done ? "✓ " : ""}
          {step.label}
          <small>
            {step.hint}
            {i === currentIndex ? " · now" : ""}
          </small>
        </li>
      ))}
    </ol>
  );
}

function Spotlight({ request }: { request: HelpRequest }) {
  const session = useEventSession();
  useNow(1000); // the clock below ticks in real time
  const since =
    request.status === "IN_PROGRESS" && request.startedAt
      ? request.startedAt
      : request.status === "CLAIMED" && request.claimedAt
        ? request.claimedAt
        : request.createdAt;
  const waitingTooLong =
    request.status === "WAITING" &&
    Date.now() - new Date(request.createdAt).getTime() > LONG_WAIT_MS;

  return (
    <section className={own.spotlight} aria-labelledby="active-request">
      <div className={own.spotlightTop}>
        <span className={own.spotlightLabel}>
          <IconHandRaised size={16} />
          Your active request
        </span>
        <Status request={request} />
      </div>

      <div className={own.spotlightBody}>
        <div>
          <h2 id="active-request">
            <Link
              to={`/event/${session.eventId}/requests/${request.id}`}
            >
              {request.title}
            </Link>
          </h2>

          <ul className={own.facts}>
            <li>
              <IconPen size={14} />
              {categoryOf(request)}
            </li>
            <li>
              <IconTable size={14} />
              Table {request.tableLabel}
            </li>
            <li>
              <IconClock size={14} />
              Asked {dateTime(request.createdAt)}
            </li>
          </ul>

          <Track request={request} />

          {request.details && (
            <p className={own.detailText}>{request.details}</p>
          )}

          <RequestActions request={request} />
        </div>

        <div>
          <div className={own.clock}>
            <span className={own.clockValue}>{elapsed(since)}</span>
            <span className={own.clockLabel}>
              {request.status === "WAITING" ? (
                <>
                  Waiting for a mentor
                  {waitingTooLong && (
                    <>
                      <br />
                      <span className={own.clockLate}>
                        Over ten minutes — an organizer can see this too
                      </span>
                    </>
                  )}
                </>
              ) : request.status === "CLAIMED" ? (
                "Since a mentor claimed it"
              ) : (
                "Working on it together"
              )}
            </span>
          </div>

          {request.mentorName ? (
            <p className={own.mentorBox}>
              <strong>{request.mentorName}</strong>
              {request.status === "CLAIMED"
                ? "is on the way to your table."
                : "is with you now."}
            </p>
          ) : (
            <p className={own.mentorBox} style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}>
              <strong>No mentor yet</strong>
              Every available mentor can see this request. Stay at table{" "}
              {request.tableLabel}.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ParticipantHome() {
  const session = useEventSession();
  const query = useRequests();
  const [params] = useSearchParams();
  const rows = query.data || [];
  const activeRows = rows
    .filter((r) => ACTIVE.includes(r.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const active = activeRows[0];
  const alsoOpen = activeRows.slice(1);
  const past = rows
    .filter((r) => !ACTIVE.includes(r.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resolved = rows.filter((r) => r.status === "RESOLVED").length;

  return (
    <>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>YOUR EVENT WORKSPACE</p>
          <h1>
            Hey {session.displayName}.<br />
            <em>Keep your ideas moving.</em>
          </h1>
          <p>Your questions, conversations and breakthroughs in one place.</p>
        </div>
        {session.eventStatus === "OPEN" && (
          <div className={own.headerActions}>
            <Link
              className={css.secondary}
              to={`/event/${session.eventId}/assistant`}
            >
              <IconBrain size={18} />
              AI assistant
            </Link>
            <Link className={css.primary} to={`/event/${session.eventId}/new`}>
              <IconPlus size={18} />
              {active ? "Ask for more help" : "Ask for help"}
            </Link>
          </div>
        )}
      </div>

      {params.get("help") === "ai-resolved" && (
        <p className={css.success} role="status">
          Glad the suggestions helped. No mentor request was created.
        </p>
      )}

      {query.isPending ? (
        <Loading text="Loading your requests…" />
      ) : query.isError ? (
        <Alert error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <div className={own.summary}>
            <div>
              <strong>{activeRows.length}</strong>
              <span>Open right now</span>
            </div>
            <div>
              <strong>{resolved}</strong>
              <span>Resolved with a mentor</span>
            </div>
            <div>
              <strong>{rows.length}</strong>
              <span>Asked at this event</span>
            </div>
            <div>
              <strong>{session.tableLabel || "—"}</strong>
              <span>Your table</span>
            </div>
          </div>

          {active ? (
            <Spotlight request={active} />
          ) : (
            <section className={own.prompt}>
              <div>
                <IconUsers size={40} />
                <h2>
                  Nothing open. <br />
                  Ask when you need a hand.
                </h2>
                <p>
                  Describe the blocker once and the room's mentors can see it
                  straight away. Ask about as many things as you need — each
                  request is picked up on its own. Want a first pass before a
                  mentor walks over? Try the AI assistant.
                </p>
                {session.eventStatus === "OPEN" && (
                  <div className={own.headerActions}>
                    <Link
                      className={css.primary}
                      to={`/event/${session.eventId}/new`}
                    >
                      Ask for help
                      <IconArrowRight size={18} />
                    </Link>
                    <Link
                      className={css.secondary}
                      to={`/event/${session.eventId}/assistant`}
                    >
                      <IconBrain size={18} />
                      Try the AI assistant
                    </Link>
                  </div>
                )}
              </div>
              <ul className={own.tips}>
                <li>
                  <IconCheck size={16} />
                  Say what you expected and what happened instead.
                </li>
                <li>
                  <IconCheck size={16} />
                  List what you already tried — it saves the first ten minutes.
                </li>
                <li>
                  <IconCheck size={16} />
                  Keep your table label accurate so the mentor can find you.
                </li>
              </ul>
            </section>
          )}

          {alsoOpen.length > 0 && (
            <>
              <div className={css.sectionLabel}>
                <h2>Also open</h2>
                <span>
                  {alsoOpen.length} more{" "}
                  {alsoOpen.length === 1 ? "request" : "requests"} in the queue
                </span>
              </div>
              <ul className={own.history}>
                {alsoOpen.map((request) => (
                  <li key={request.id} className={own.historyRow}>
                    <span className={own.historyTitle}>
                      <Link
                        to={`/event/${session.eventId}/requests/${request.id}`}
                      >
                        {request.title}
                      </Link>
                    </span>
                    <span className={own.historyMeta}>
                      {categoryOf(request)} · Table {request.tableLabel}
                    </span>
                    <span className={own.historyMeta}>
                      {request.status === "WAITING"
                        ? `Waiting ${elapsed(request.createdAt)}`
                        : request.mentorName
                          ? `With ${request.mentorName}`
                          : statusText[request.status]}
                    </span>
                    <Status request={request} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {past.length > 0 && (
            <>
              <div className={css.sectionLabel}>
                <h2>Earlier requests</h2>
                <span>
                  {past.length} closed · Updates every 4 seconds
                </span>
              </div>
              <ul className={own.history}>
                {past.map((request) => (
                  <li key={request.id} className={own.historyRow}>
                    <span className={own.historyTitle}>
                      <Link
                        to={`/event/${session.eventId}/requests/${request.id}`}
                      >
                        {request.title}
                      </Link>
                    </span>
                    <span className={own.historyMeta}>
                      {categoryOf(request)} · {dateTime(request.createdAt)}
                    </span>
                    <span className={own.historyMeta}>
                      {request.mentorName
                        ? `Helped by ${request.mentorName}`
                        : statusText[request.status]}
                    </span>
                    <Status request={request} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}
