import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMe } from "../api/session";
import { useEventSession, useRequests } from "../hooks/useEvent";
import { useNow } from "../hooks/useMotion";
import { categoryOf, dateTime, elapsed } from "../shared/requests";
import { TAGS } from "../shared/tags";
import type { HelpRequest, Tag } from "../shared/types";
import {
  Alert,
  Empty,
  Loading,
  RequestActions,
  Status,
  css,
} from "../components/event/UI";
import {
  IconArrowRight,
  IconClock,
  IconInbox,
  IconTable,
  IconTarget,
  IconUsers,
} from "../components/icons";
import own from "./MentorWorkspace.module.css";

const LONG_WAIT_MS = 10 * 60_000;
type TabKey = "waiting" | "mine" | "all";

/**
 * Tier 1: the main topic is one of my skills. Tier 2: any other topic
 * overlaps. Tier 3: no overlap. Oldest first inside each tier.
 */
function tierOf(request: HelpRequest, skills: Tag[]): 1 | 2 | 3 {
  if (skills.includes(request.primaryTag)) return 1;
  if (request.tags.some((tag) => skills.includes(tag))) return 2;
  return 3;
}

function waitedTooLong(request: HelpRequest) {
  return (
    request.status === "WAITING" &&
    Date.now() - new Date(request.createdAt).getTime() > LONG_WAIT_MS
  );
}

export default function MentorWorkspace() {
  const session = useEventSession();
  const query = useRequests();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: TabKey =
    tabParam === "mine" || tabParam === "all" ? tabParam : "waiting";
  const setTab = (next: TabKey) =>
    setParams(next === "waiting" ? {} : { tab: next }, { replace: true });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useNow(1000); // waiting times tick in place

  const profile = useMutation({
    mutationFn: (patch: Parameters<typeof updateMe>[1]) =>
      updateMe(session.eventId, patch),
    onSuccess: (updated) => qc.setQueryData(["session"], updated),
  });

  const skills = useMemo(() => session.skills || [], [session.skills]);
  const all = query.data || [];
  const waiting = all.filter((r) => r.status === "WAITING");
  const mine = all.filter(
    (r) =>
      r.mentorId === session.memberId &&
      ["CLAIMED", "IN_PROGRESS"].includes(r.status),
  );

  const rows = useMemo(() => {
    const base =
      tab === "mine" ? mine : tab === "all" ? all : waiting;
    const term = search.trim().toLowerCase();
    const filtered = term
      ? base.filter(
          (r) =>
            r.title.toLowerCase().includes(term) ||
            r.requesterName.toLowerCase().includes(term),
        )
      : [...base];
    // The skill tiers only apply to the queue of open requests; "All" and
    // "Mine" are plain oldest-first lists.
    return filtered.sort((a, b) =>
      tab === "waiting"
        ? tierOf(a, skills) - tierOf(b, skills) ||
          a.createdAt.localeCompare(b.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );
  }, [tab, all, mine, waiting, search, skills]);

  const selected =
    rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  const longestWait = waiting.reduce<string | null>(
    (oldest, r) =>
      !oldest || r.createdAt < oldest ? r.createdAt : oldest,
    null,
  );
  const matches = waiting.filter((r) => tierOf(r, skills) < 3).length;
  const canEdit = session.eventStatus === "OPEN" && !profile.isPending;

  function toggleSkill(tag: Tag) {
    profile.mutate({
      skills: skills.includes(tag)
        ? skills.filter((t) => t !== tag)
        : [...skills, tag],
      isAvailable: session.isAvailable ?? true,
    });
  }

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
          className={own.availability}
          type="button"
          role="switch"
          aria-checked={session.isAvailable ?? true}
          disabled={profile.isPending || session.eventStatus !== "OPEN"}
          onClick={() =>
            profile.mutate({
              skills,
              isAvailable: !session.isAvailable,
            })
          }
        >
          <span
            className={`${own.dot} ${session.isAvailable ? own.dotOn : ""}`}
            aria-hidden="true"
          />
          <span>
            {session.isAvailable ? "Available" : "Away"}
            <small>
              {profile.isPending
                ? "Updating…"
                : session.isAvailable
                  ? "Counted as free capacity"
                  : "Current requests stay yours"}
            </small>
          </span>
        </button>
      </div>

      {profile.error && <Alert error={profile.error} />}

      <div className={own.bar}>
        <div>
          <strong>{waiting.length}</strong>
          <span>Teams waiting</span>
        </div>
        <div>
          <strong>{matches}</strong>
          <span>Match your skills</span>
        </div>
        <div>
          <strong>{mine.length}</strong>
          <span>Assigned to you</span>
        </div>
        <div className={waiting.some(waitedTooLong) ? own.barAlert : undefined}>
          <strong>{longestWait ? elapsed(longestWait) : "—"}</strong>
          <span>Longest wait right now</span>
        </div>
      </div>

      <details className={css.panel}>
        <summary className={css.settingsSummary}>
          Your skills <span>{skills.length} selected</span>
        </summary>
        <p className={css.meta}>
          Requests whose main topic matches a skill come first, then partial
          matches, then everything else — oldest first inside each group.
        </p>
        <div className={own.skills}>
          {TAGS.map((tag) => {
            const on = skills.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                disabled={!canEdit}
                className={`${own.skill} ${on ? own.skillOn : ""}`}
                onClick={() => toggleSkill(tag)}
              >
                {on ? "✓ " : ""}
                {tag}
              </button>
            );
          })}
        </div>
      </details>

      <div className={css.toolbar}>
        <div className={css.tabs} role="group" aria-label="Mentor request view">
          <button
            type="button"
            aria-pressed={tab === "waiting"}
            onClick={() => setTab("waiting")}
          >
            Waiting ({waiting.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            Mine ({mine.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "all"}
            onClick={() => setTab("all")}
          >
            All requests ({all.length})
          </button>
        </div>
        <div className={css.filters}>
          <label>
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title or team…"
            />
          </label>
        </div>
      </div>

      {query.isPending ? (
        <Loading text="Loading the mentor queue…" />
      ) : query.isError ? (
        <Alert error={query.error} retry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <Empty
          title={
            search
              ? "No matching requests."
              : tab === "mine"
                ? "Nothing assigned to you yet."
                : "No teams are waiting right now."
          }
        >
          <p>
            {tab === "mine"
              ? "Claim a waiting request and it will appear here."
              : "New requests appear automatically, no refresh needed."}
          </p>
          {search && (
            <button type="button" onClick={() => setSearch("")}>
              Clear search
            </button>
          )}
        </Empty>
      ) : (
        <div className={own.workspace}>
          <div>
            <p className={own.queueHead} role="status">
              <span>
                {rows.length} {rows.length === 1 ? "request" : "requests"} ·{" "}
                {tab === "waiting" && skills.length
                  ? "Best match first"
                  : "Oldest first"}
              </span>
              <span>Updates every 4 seconds</span>
            </p>
            <ul className={own.queue}>
              {rows.map((request) => {
                const tier = tierOf(request, skills);
                const isSelected = selected?.id === request.id;
                return (
                  <li key={request.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className={`${own.row} ${isSelected ? own.rowActive : ""}`}
                      onClick={() => setSelectedId(request.id)}
                    >
                      <span className={own.rowTop}>
                        <span className={own.rowTitle}>{request.title}</span>
                        <Status request={request} />
                      </span>
                      <span className={own.rowMeta}>
                        <span>
                          <IconUsers size={13} />
                          {request.requesterName}
                        </span>
                        <span>
                          <IconTable size={13} />
                          Table {request.tableLabel}
                        </span>
                        <span
                          className={waitedTooLong(request) ? own.late : undefined}
                        >
                          <IconClock size={13} />
                          {request.status === "WAITING"
                            ? `Waiting ${elapsed(request.createdAt)}`
                            : dateTime(request.createdAt)}
                          {waitedTooLong(request) && " · over 10 min"}
                        </span>
                      </span>
                      <span className={own.rowMeta}>
                        <span
                          className={`${own.match} ${tier === 1 ? own.matchPrimary : ""}`}
                        >
                          {tier === 1
                            ? `Matches ${request.primaryTag}`
                            : tier === 2
                              ? "Partial match"
                              : categoryOf(request)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className={own.detail} aria-live="polite">
            {selected ? (
              <>
                <div className={own.detailTop}>
                  <span>Request detail</span>
                  <Status request={selected} />
                </div>
                <div className={own.detailBody}>
                  <h2>
                    <Link
                      to={`/event/${session.eventId}/requests/${selected.id}`}
                    >
                      {selected.title}
                    </Link>
                  </h2>
                  <ul className={own.detailFacts}>
                    <li>
                      <IconUsers size={14} />
                      {selected.requesterName}
                    </li>
                    <li>
                      <IconTable size={14} />
                      Table {selected.tableLabel}
                    </li>
                    <li>
                      <IconTarget size={14} />
                      {categoryOf(selected)}
                    </li>
                    <li>
                      <IconClock size={14} />
                      {selected.status === "WAITING"
                        ? `Waiting ${elapsed(selected.createdAt)}`
                        : `Asked ${dateTime(selected.createdAt)}`}
                    </li>
                  </ul>

                  {selected.details ? (
                    <>
                      <p className={own.blockLabel}>What is going wrong</p>
                      <p className={own.blockText}>{selected.details}</p>
                    </>
                  ) : (
                    <p className={own.blockText}>
                      The full description opens to you once you claim this
                      request.
                    </p>
                  )}

                  {selected.attemptedSteps && (
                    <>
                      <p className={own.blockLabel}>Already tried</p>
                      <p className={own.blockText}>{selected.attemptedSteps}</p>
                    </>
                  )}

                  {selected.codeSnippet && (
                    <>
                      <p className={own.blockLabel}>Code</p>
                      <pre className={own.snippet}>
                        <code>{selected.codeSnippet}</code>
                      </pre>
                    </>
                  )}

                  {selected.mentorName && (
                    <p className={css.meta}>Mentor: {selected.mentorName}</p>
                  )}

                  <RequestActions request={selected} />

                  <p style={{ marginTop: 16 }}>
                    <Link
                      className={css.textLink}
                      to={`/event/${session.eventId}/requests/${selected.id}`}
                    >
                      Open the full request
                      <IconArrowRight size={16} />
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className={own.placeholder}>
                <IconInbox size={30} />
                <p>Pick a request from the queue to read it here.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
