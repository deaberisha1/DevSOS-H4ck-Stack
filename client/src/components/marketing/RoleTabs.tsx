import { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IconCheck, IconClipboard, IconHandRaised, IconUsers } from "../icons";
import type { IconProps } from "../icons";
import shared from "../../styles/marketing.module.css";
import css from "./RoleTabs.module.css";

interface RoleTab {
  id: string;
  label: string;
  Icon: (p: IconProps) => JSX.Element;
  headline: string;
  blurb: string;
  points: string[];
  cta: { to: string; label: string };
}

const ROLES: RoleTab[] = [
  {
    id: "participant",
    label: "Participant",
    Icon: IconHandRaised,
    headline: "Get unstuck without hunting for a mentor",
    blurb:
      "Ask from your seat, in under a minute, and watch it move. You always know whether anyone has picked it up and who is coming.",
    points: [
      "Describe the problem once, in writing, while it is fresh",
      "See the status and the mentor's name on your own card",
      "Resolve or cancel yourself the moment you are through",
      "One active request at a time, so the queue stays honest",
    ],
    cta: { to: "/join", label: "Join an event" },
  },
  {
    id: "mentor",
    label: "Mentor",
    Icon: IconUsers,
    headline: "Spend your time helping, not triaging",
    blurb:
      "The queue is sorted by what you actually know, and every card carries enough context to decide before you stand up.",
    points: [
      "Skill-matched sorting, oldest first inside each tier",
      "What is wrong and what they already tried, up front",
      "Claim, start, resolve — or release it back, no penalty",
      "Away toggle for food, sleep and judging",
    ],
    cta: { to: "/for-mentors", label: "Read the mentor guide" },
  },
  {
    id: "organizer",
    label: "Organizer",
    Icon: IconClipboard,
    headline: "See the whole room at a glance",
    blurb:
      "Counts by status and the oldest unanswered requests, live. Enough to know whether the room needs more mentors before anyone complains.",
    points: [
      "Live counts by status on a screen anyone can see",
      "Oldest-waiting list, with anything past ten minutes flagged",
      "Release, resolve or cancel any stuck request",
      "Close the event in one action when judging starts",
    ],
    cta: { to: "/for-organizers", label: "Read the organizer guide" },
  },
];

export default function RoleTabs() {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between tabs, Home/End jump to the ends — what a screen
  // reader user expects from a tablist.
  function onKeyDown(e: React.KeyboardEvent) {
    const last = ROLES.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={css.wrap}>
      <div className={css.tablist} role="tablist" aria-label="Choose a role" onKeyDown={onKeyDown}>
        {ROLES.map((role, i) => {
          const selected = i === active;
          return (
            <button
              key={role.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${role.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${role.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? `${css.tab} ${css.tabActive}` : css.tab}
              onClick={() => setActive(i)}
            >
              <role.Icon size={18} />
              {role.label}
            </button>
          );
        })}
      </div>

      {ROLES.map((role, i) => (
        <div
          key={role.id}
          role="tabpanel"
          id={`${baseId}-panel-${role.id}`}
          aria-labelledby={`${baseId}-tab-${role.id}`}
          hidden={i !== active}
          tabIndex={0}
          className={css.panel}
        >
          <div className={css.panelGrid}>
            <div>
              <h3 className={css.panelTitle}>{role.headline}</h3>
              <p className={css.panelBlurb}>{role.blurb}</p>
              <Link className={shared.btnPrimary} to={role.cta.to}>
                {role.cta.label}
              </Link>
            </div>
            <ul className={css.points}>
              {role.points.map((point) => (
                <li key={point}>
                  <IconCheck size={18} className={css.pointIcon} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
