import { Link, useSearchParams } from "react-router-dom";
import { useEventSession, useRequests } from "../hooks/useEvent";
import {
  Alert,
  Empty,
  Loading,
  RequestCard,
  css,
} from "../components/event/UI";
import { IconPlus } from "../components/icons";
export default function ParticipantHome() {
  const session = useEventSession();
  const query = useRequests();
  const [params] = useSearchParams();
  const rows = query.data || [];
  const active = rows.find((r) =>
    ["WAITING", "CLAIMED", "IN_PROGRESS"].includes(r.status),
  );
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
          <Link
            className={css.primary}
            to={
              active
                ? `/event/${session.eventId}/requests/${active.id}`
                : `/event/${session.eventId}/new`
            }
          >
            <IconPlus size={18} />
            {active ? "View active request" : "Ask for help"}
          </Link>
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
      ) : rows.length ? (
        <>
          <div className={css.sectionLabel}>
            <h2>Your requests</h2>
            <span>{rows.length} total · Updates every 4 seconds</span>
          </div>
          <div className={css.grid}>
            {[...rows]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((request) => (
                <RequestCard request={request} key={request.id} />
              ))}
          </div>
        </>
      ) : (
        <Empty title="No blockers on the board.">
          <p>
            When you need a hand, tell us what you're working on. Your requests
            will appear here.
          </p>
          {session.eventStatus === "OPEN" && (
            <Link className={css.primary} to={`/event/${session.eventId}/new`}>
              Ask your first question
            </Link>
          )}
        </Empty>
      )}
    </>
  );
}
