import { Link, useParams } from "react-router-dom";
import { useEventSession, useRequest } from "../hooks/useEvent";
import { homePathFor } from "../shared/navigation";
import { categoryOf, dateTime, statusText } from "../shared/requests";
import {
  Alert,
  Loading,
  RequestActions,
  Status,
  css,
} from "../components/event/UI";
export default function RequestDetails() {
  const { r = "" } = useParams();
  const session = useEventSession();
  const query = useRequest(r);
  if (query.isPending) return <Loading text="Loading request…" />;
  if (query.isError)
    return (
      <>
        <Link to={homePathFor(session)}>Back to dashboard</Link>
        <Alert error={query.error} retry={() => void query.refetch()} />
      </>
    );
  const request = query.data;
  const stages = [
    { status: "WAITING", label: "Submitted", time: request.createdAt },
    {
      status: "CLAIMED",
      label: "Claimed",
      time: request.firstClaimedAt || request.claimedAt,
    },
    { status: "IN_PROGRESS", label: "In progress", time: request.startedAt },
    {
      status: request.status === "CANCELLED" ? "CANCELLED" : "RESOLVED",
      label: request.status === "CANCELLED" ? "Cancelled" : "Resolved",
      time: request.cancelledAt || request.resolvedAt,
    },
  ];
  return (
    <>
      <Link className={css.textLink} to={homePathFor(session)}>
        Back to dashboard
      </Link>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>
            {categoryOf(request)} · Table {request.tableLabel}
          </p>
          <h1>{request.title}</h1>
          <p>
            Asked by {request.requesterName} · {dateTime(request.createdAt)}
          </p>
        </div>
        <Status request={request} />
      </div>
      <div className={css.formGrid}>
        <section className={css.panel}>
          <h2>The problem</h2>
          {request.details ? (
            <p className={css.problem}>{request.details}</p>
          ) : (
            <p className={css.banner}>
              Full details are available to the participant, assigned mentor and
              organizers. Claim this request to view the full context.
            </p>
          )}
          {request.attemptedSteps && (
            <>
              <h3>Already tried</h3>
              <p className={css.problem}>{request.attemptedSteps}</p>
            </>
          )}
          {request.codeSnippet && (
            <>
              <h3>Code snippet</h3>
              <pre className={css.code}>
                <code>{request.codeSnippet}</code>
              </pre>
            </>
          )}
          <div className={css.assignment}>
            <strong>
              {request.mentorName
                ? `Mentor: ${request.mentorName}`
                : "No mentor assigned"}
            </strong>
            <p>
              {statusText[request.status]} · Updated{" "}
              {dateTime(request.updatedAt)}
            </p>
          </div>
          <RequestActions request={request} />
        </section>
        <aside className={css.panel}>
          <p className={css.eyebrow}>YOUR REQUEST'S JOURNEY</p>
          <h2>One step at a time.</h2>
          <ol className={css.timeline}>
            {stages.map((stage) => (
              <li
                key={stage.status}
                data-done={!!stage.time}
                aria-current={
                  stage.status === request.status ? "step" : undefined
                }
              >
                <span />
                <div>
                  <strong>{stage.label}</strong>
                  <p>
                    {stage.time
                      ? dateTime(stage.time)
                      : stage.status === "CLAIMED" &&
                          request.status === "WAITING"
                        ? "Waiting for a mentor"
                        : request.status === "CANCELLED"
                          ? "Not completed"
                          : "Not yet"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className={css.meta}>
            Updates every 4 seconds while this page is active. No estimated
            waiting time is assumed.
          </p>
        </aside>
      </div>
    </>
  );
}
