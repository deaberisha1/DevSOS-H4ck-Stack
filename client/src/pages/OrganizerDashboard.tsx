import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeEvent } from "../api/events";
import {
  useEventSession,
  useEventStats,
  useMentors,
  useRequests,
  eventKey,
} from "../hooks/useEvent";
import { categoryOf } from "../shared/requests";
import { Alert, Empty, Loading, Status, css } from "../components/event/UI";
export default function OrganizerDashboard() {
  const session = useEventSession();
  const stats = useEventStats();
  const requests = useRequests();
  const mentors = useMentors();
  const qc = useQueryClient();
  const [copy, setCopy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const joinUrl = `${window.location.origin}/join?code=${encodeURIComponent(session.eventCode)}`;
  const close = useMutation({
    mutationFn: () => closeEvent(session.eventId),
    onSuccess: () => {
      setConfirm(false);
      void qc.invalidateQueries({ queryKey: eventKey(session.eventId) });
      void qc.invalidateQueries({ queryKey: ["session"] });
    },
  });
  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopy(`${label} copied.`);
    } catch {
      setCopy("Clipboard unavailable. Select and copy the code or link below.");
    }
  }
  const counts = stats.data?.counts;
  return (
    <>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>THE ORGANIZER WORKSPACE</p>
          <h1>
            A clear view.
            <br />
            <em>A calmer room.</em>
          </h1>
          <p>Keep your mentors connected to the teams who need them.</p>
        </div>
        {session.eventStatus === "OPEN" && (
          <button
            className={css.secondary}
            type="button"
            onClick={() => setConfirm(true)}
          >
            Close event
          </button>
        )}
      </div>
      <section className={css.panel}>
        <div className={css.row}>
          <h2>Invite the room</h2>
          <span className={css.meta}>
            Participant link · Mentor invitation stays separate
          </span>
        </div>
        <div className={css.invite}>
          <label>
            Event code
            <input
              value={session.eventCode}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            type="button"
            onClick={() => void copyValue(session.eventCode, "Event code")}
          >
            Copy code
          </button>
          <label>
            Join link
            <input
              value={joinUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            type="button"
            onClick={() => void copyValue(joinUrl, "Join link")}
          >
            Copy link
          </button>
        </div>
        <p role="status" className={css.success}>
          {copy}
        </p>
      </section>
      {confirm && (
        <section className={css.confirm} aria-labelledby="close-title">
          <h2 id="close-title">
            Close {session.eventName || session.eventCode}?
          </h2>
          <p>
            This stops new requests and makes the queue read-only. Finish
            outstanding requests first.
          </p>
          <div className={css.actions}>
            <button
              className={css.primary}
              type="button"
              disabled={close.isPending}
              onClick={() => close.mutate()}
            >
              {close.isPending ? "Closing…" : "Yes, close event"}
            </button>
            <button
              type="button"
              disabled={close.isPending}
              onClick={() => setConfirm(false)}
            >
              Keep event open
            </button>
          </div>
          {close.error && <Alert error={close.error} />}
        </section>
      )}
      {stats.isPending ? (
        <Loading text="Loading event totals…" />
      ) : stats.isError ? (
        <Alert error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        counts && (
          <div className={css.stats}>
            {[
              {
                name: "Total requests",
                value: Object.values(counts).reduce((a, b) => a + b, 0),
              },
              { name: "Waiting", value: counts.WAITING },
              { name: "Active", value: counts.CLAIMED + counts.IN_PROGRESS },
              { name: "Resolved", value: counts.RESOLVED },
            ].map((item) => (
              <div key={item.name}>
                <strong>{item.value}</strong>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        )
      )}
      <section className={css.panel}>
        <h2>Requests across the room</h2>
        <p className={css.meta}>
          Open any request for details and organizer actions.
        </p>
        {requests.isPending ? (
          <Loading />
        ) : requests.isError ? (
          <Alert error={requests.error} retry={() => void requests.refetch()} />
        ) : requests.data?.length ? (
          <div className={css.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Participant</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Mentor</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/event/${session.eventId}/requests/${r.id}`}>
                        {r.title}
                      </Link>
                    </td>
                    <td>{r.requesterName}</td>
                    <td>{categoryOf(r)}</td>
                    <td>
                      <Status request={r} />
                    </td>
                    <td>{r.mentorName || "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No requests yet." />
        )}
      </section>
      <section className={css.panel}>
        <h2>Mentor overview</h2>
        {mentors.isPending ? (
          <Loading text="Loading mentors…" />
        ) : mentors.isError ? (
          <Alert error={mentors.error} retry={() => void mentors.refetch()} />
        ) : mentors.data?.length ? (
          <div className={css.grid}>
            {mentors.data.map((m) => (
              <article key={m.id} className={css.card}>
                <div className={css.row}>
                  <h3>{m.displayName}</h3>
                  <span>{m.isAvailable ? "Available" : "Away"}</span>
                </div>
                <p>{m.activeRequests} active requests</p>
                <p className={css.meta}>
                  {m.skills.length ? m.skills.join(", ") : "No skills selected"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="No mentors have joined yet.">
            <p>Share mentor invitations with your support team.</p>
          </Empty>
        )}
      </section>
    </>
  );
}
