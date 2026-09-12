import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useMotion";
import { IconArrowRight, IconCheck, IconHandRaised, IconSignal } from "../icons";
import css from "./QueueDemo.module.css";

/**
 * A playable miniature of the mentor queue for the home page. It is a
 * demonstration only — no API, no event data — but the states, the button
 * names and the wording match the real workspace exactly, so what someone
 * learns here is true when they get there.
 */

type DemoStatus = "WAITING" | "CLAIMED" | "IN_PROGRESS" | "RESOLVED";

interface DemoRow {
  id: number;
  title: string;
  tag: string;
  table: string;
  status: DemoStatus;
  mentor?: string;
  age: number;
  held: number;
}

const POOL: Array<Pick<DemoRow, "title" | "tag" | "table">> = [
  { title: "useEffect runs twice and doubles our fetch", tag: "React", table: "B4" },
  { title: "Postgres connection refused from the container", tag: "Database", table: "C2" },
  { title: "Modal traps focus behind the overlay", tag: "UI", table: "D7" },
  { title: "Vercel build passes locally, fails on deploy", tag: "Deployment", table: "A9" },
  { title: "Merge conflict in package-lock we cannot resolve", tag: "Git", table: "A1" },
  { title: "JWT works in Postman, 401 in the browser", tag: "Backend", table: "E3" },
];

const START: DemoRow[] = [
  { id: 1, ...POOL[0]!, status: "WAITING", age: 724_000, held: 724_000 },
  { id: 2, ...POOL[1]!, status: "WAITING", age: 361_000, held: 361_000 },
  { id: 3, ...POOL[2]!, status: "IN_PROGRESS", mentor: "Sam", age: 1_260_000, held: 401_000 },
];

const STATUS_TEXT: Record<DemoStatus, string> = {
  WAITING: "Waiting",
  CLAIMED: "Claimed",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

const STATUS_CLASS: Record<DemoStatus, string | undefined> = {
  WAITING: css.waiting,
  CLAIMED: css.claimed,
  IN_PROGRESS: css.progress,
  RESOLVED: css.resolved,
};

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function QueueDemo() {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<DemoRow[]>(START);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("All");
  const [announcement, setAnnouncement] = useState("");
  const nextId = useRef(100);

  // One ticker drives every elapsed time on the card.
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setRows((prev) =>
        prev.map((r) =>
          r.status === "RESOLVED" ? { ...r, held: r.held + 1000 } : { ...r, age: r.age + 1000, held: r.held + 1000 },
        ),
      );
    }, 1000);
    return () => window.clearInterval(t);
  }, [paused]);

  // New requests keep arriving, the way they do in a real room. Resolved rows
  // clear themselves. Both are paused when motion is reduced.
  useEffect(() => {
    if (reduced) return;
    if (paused) return;
    const t = window.setInterval(() => {
      setRows((prev) => {
        const live = prev.filter((r) => r.status !== "RESOLVED" || r.held < 5000);
        if (live.length >= 4) return live;
        const used = new Set(live.map((r) => r.title));
        const candidate = POOL.find((p) => !used.has(p.title));
        if (!candidate) return live;
        nextId.current += 1;
        return [...live, { id: nextId.current, ...candidate, status: "WAITING", age: 0, held: 0 }];
      });
    }, 7000);
    return () => window.clearInterval(t);
  }, [reduced, paused]);

  function act(id: number, next: DemoStatus) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: next, held: 0, mentor: next === "WAITING" ? undefined : "you" }
          : r,
      ),
    );
    const row = rows.find((r) => r.id === id);
    if (row) setAnnouncement(`${row.title}. Status: ${STATUS_TEXT[next]}.`);
  }

  function reset() {
    setRows(START);
    setFilter("All");
    setAnnouncement("Demo reset.");
  }

  return (
    <div className={css.card}>
      <div className={css.bar}>
        <span className={css.barTitle}>
          <IconSignal size={16} />
          Mentor queue
        </span>
        <span className={css.barMeta}>
          {rows.filter((r) => r.status === "WAITING").length} waiting
        </span>
      </div>

      <p className={css.hint}>
        A demo, not a real event — try claiming one.
      </p>

      <div className={css.filters} role="group" aria-label="Filter demo requests">
        {["All", "Waiting", "Helping", "Resolved"].map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}
      </div>
      <ul className={css.list}>
        {rows.filter(row => filter === "All" || (filter === "Waiting" && row.status === "WAITING") || (filter === "Helping" && (row.status === "CLAIMED" || row.status === "IN_PROGRESS")) || (filter === "Resolved" && row.status === "RESOLVED")).map((row) => (
          <li key={row.id} className={`${css.row} ${row.status === "RESOLVED" ? css.rowDone : ""}`}>
            <div className={css.rowTop}>
              <span className={css.rowTitle}>{row.title}</span>
              <span key={row.status} className={`${css.badge} ${STATUS_CLASS[row.status]}`}>
                {STATUS_TEXT[row.status]}
              </span>
            </div>

            <div className={css.meta}>
              <span className={css.tag}>{row.tag}</span>
              <span>Table {row.table}</span>
              {row.status === "WAITING" && (
                <span className={row.age > 600_000 ? css.late : undefined}>
                  Waiting for {clock(row.age)}
                  {row.age > 600_000 && <span className="visually-hidden"> — over ten minutes</span>}
                </span>
              )}
              {row.status === "CLAIMED" && (
                <span>{row.mentor === "you" ? "You are on the way" : `${row.mentor} is on the way`}</span>
              )}
              {row.status === "IN_PROGRESS" && (
                <span>
                  {row.mentor === "you" ? "With you" : `With ${row.mentor}`} for {clock(row.held)}
                </span>
              )}
              {row.status === "RESOLVED" && <span>Closed after {clock(row.age)}</span>}
            </div>

            <div className={css.actions}>
              {row.status === "WAITING" && (
                <button type="button" className={css.action} onClick={() => act(row.id, "CLAIMED")}>
                  <IconHandRaised size={16} />
                  I can help
                  <span className="visually-hidden"> with {row.title}</span>
                </button>
              )}
              {row.status === "CLAIMED" && row.mentor === "you" && (
                <>
                  <button
                    type="button"
                    className={css.action}
                    onClick={() => act(row.id, "IN_PROGRESS")}
                  >
                    <IconArrowRight size={16} />
                    Start helping
                    <span className="visually-hidden"> {row.title}</span>
                  </button>
                  <button
                    type="button"
                    className={css.actionQuiet}
                    onClick={() => act(row.id, "WAITING")}
                  >
                    Release
                    <span className="visually-hidden"> {row.title}</span>
                  </button>
                </>
              )}
              {row.status === "IN_PROGRESS" && row.mentor === "you" && (
                <button
                  type="button"
                  className={css.action}
                  onClick={() => act(row.id, "RESOLVED")}
                >
                  <IconCheck size={16} />
                  Resolve
                  <span className="visually-hidden"> {row.title}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!rows.some(row => filter === "All" || (filter === "Waiting" && row.status === "WAITING") || (filter === "Helping" && (row.status === "CLAIMED" || row.status === "IN_PROGRESS")) || (filter === "Resolved" && row.status === "RESOLVED")) && <p className={css.empty}>No {filter.toLowerCase()} requests. Choose All to explore the queue.</p>}

      <div className={css.foot}>
        <button type="button" className={css.actionQuiet} onClick={reset}>
          Reset demo
        </button>
        <button type="button" className={css.actionQuiet} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume simulation" : "Pause simulation"}</button>
      </div>

      {/* Exactly how the real app announces a status change. */}
      <p aria-live="polite" className="visually-hidden">
        {announcement}
      </p>
    </div>
  );
}



