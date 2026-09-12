import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMe } from "../api/session";
import { useEventSession, useRequests } from "../hooks/useEvent";
import { CATEGORIES, categoryOf } from "../shared/requests";
import { TAGS } from "../shared/tags";
import {
  Alert,
  Empty,
  Loading,
  RequestCard,
  css,
} from "../components/event/UI";
export default function MentorWorkspace() {
  const session = useEventSession();
  const query = useRequests();
  const qc = useQueryClient();
  const [tab, setTab] = useState("waiting");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const profile = useMutation({
    mutationFn: (patch: Parameters<typeof updateMe>[1]) =>
      updateMe(session.eventId, patch),
    onSuccess: (updated) => qc.setQueryData(["session"], updated),
  });
  const rows = (query.data || [])
    .filter((r) =>
      tab === "waiting"
        ? r.status === "WAITING"
        : r.mentorId === session.memberId,
    )
    .filter((r) => !category || categoryOf(r) === category)
    .filter((r) => r.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <>
      <div className={css.pageHeading}>
        <div>
          <p className={css.eyebrow}>THE MENTOR WORKSPACE</p>
          <h1>
            Your experience.
            <br />
            <em>Someone's next step.</em>
          </h1>
          <p>Find a request, claim it, and head over with a plan.</p>
        </div>
        <button
          className={css.secondary}
          type="button"
          role="switch"
          aria-label="Available for mentoring"
          aria-checked={session.isAvailable ?? true}
          disabled={profile.isPending || session.eventStatus !== "OPEN"}
          onClick={() =>
            profile.mutate({
              skills: session.skills || [],
              isAvailable: !session.isAvailable,
            })
          }
        >
          {session.isAvailable ? "Available" : "Away"}
          {profile.isPending ? " · Updating…" : ""}
        </button>
      </div>
      {profile.error && <Alert error={profile.error} />}
      <details className={css.panel}>
        <summary className={css.settingsSummary}>
          Your skills <span>{session.skills?.length || 0} selected</span>
        </summary>
        <p className={css.meta}>
          Choose topics you're comfortable helping with. Category and search
          filters below help you find requests.
        </p>
        <div className={css.skillGrid}>
          {TAGS.map((tag) => (
            <label key={tag}>
              <input
                type="checkbox"
                checked={session.skills?.includes(tag) || false}
                disabled={profile.isPending || session.eventStatus !== "OPEN"}
                onChange={() =>
                  profile.mutate({
                    skills: session.skills?.includes(tag)
                      ? session.skills.filter((t) => t !== tag)
                      : [...(session.skills || []), tag],
                    isAvailable: session.isAvailable ?? true,
                  })
                }
              />
              {tag}
            </label>
          ))}
        </div>
      </details>
      <div className={css.toolbar}>
        <div className={css.tabs} role="group" aria-label="Mentor request view">
          <button
            type="button"
            aria-pressed={tab === "waiting"}
            onClick={() => setTab("waiting")}
          >
            Waiting requests
          </button>
          <button
            type="button"
            aria-pressed={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            My requests
          </button>
        </div>
        <div className={css.filters}>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Search by title
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a request…"
            />
          </label>
        </div>
      </div>
      {query.isPending ? (
        <Loading text="Loading the mentor queue…" />
      ) : query.isError ? (
        <Alert error={query.error} retry={() => void query.refetch()} />
      ) : rows.length ? (
        <>
          <p className={css.meta} role="status">
            {rows.length} requests · Oldest first · Updates every 4 seconds
          </p>
          <div className={css.grid}>
            {rows.map((request) => (
              <RequestCard key={request.id} request={request} mentor />
            ))}
          </div>
        </>
      ) : (
        <Empty
          title={
            search || category
              ? "No matching requests."
              : tab === "mine"
                ? "Your next conversation starts in the queue."
                : "No teams are waiting right now."
          }
        >
          <p>
            {tab === "mine"
              ? "Claim a waiting request to see it here."
              : "New requests will appear automatically."}
          </p>
          {(search || category) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("");
              }}
            >
              Clear filters
            </button>
          )}
        </Empty>
      )}
    </>
  );
}
