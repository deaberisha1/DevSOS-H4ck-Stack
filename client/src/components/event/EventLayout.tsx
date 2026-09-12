import { useEffect, useId, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Logo from "../brand/Logo";
import { useLogout } from "../../hooks/useSession";
import {
  useEventInfo,
  useEventSession,
  useRequests,
} from "../../hooks/useEvent";
import { homePathFor } from "../../shared/navigation";
import { USE_MOCK } from "../../api/client";
import { Alert, css } from "./UI";
import {
  IconBrain,
  IconChart,
  IconClose,
  IconHandRaised,
  IconInbox,
  IconMenu,
  IconPen,
  IconPower,
  IconTable,
  IconTarget,
  IconUsers,
} from "../icons";
import own from "./EventLayout.module.css";

interface NavItem {
  to: string;
  label: string;
  Icon: typeof IconInbox;
  end?: boolean;
  count?: number;
  /**
   * Overrides the router's match when a link differs only by query string or
   * hash — those two links live on one path, so only one may read as current.
   */
  activeWhen?: boolean;
}

export default function EventLayout() {
  const session = useEventSession();
  const info = useEventInfo();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navId = useId();

  // Requests power the sidebar counts. Participants only ever receive their
  // own, so this is the same data the screens already show.
  const requests = useRequests();
  const rows = requests.data || [];
  const active = rows.filter((r) =>
    ["WAITING", "CLAIMED", "IN_PROGRESS"].includes(r.status),
  );

  const home = homePathFor(session);
  const eventName =
    info.data?.name || session.eventName || `Event ${session.eventCode}`;
  const isOpen = session.eventStatus === "OPEN" && info.data?.status !== "CLOSED";

  // Navigating closes the mobile panel; Escape does too.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const mentorTab = new URLSearchParams(location.search).get("tab");
  const onHome = location.pathname === home;

  const items: NavItem[] =
    session.role === "PARTICIPANT"
      ? [
          {
            to: home,
            label: "My requests",
            Icon: IconInbox,
            end: true,
            count: active.length,
          },
          ...(isOpen
            ? [{ to: `${home}/new`, label: "Ask for help", Icon: IconPen }]
            : []),
          { to: `${home}/assistant`, label: "AI assistant", Icon: IconBrain },
        ]
      : session.role === "MENTOR"
        ? [
            {
              to: home,
              label: "Mentor queue",
              Icon: IconTarget,
              end: true,
              activeWhen: onHome && mentorTab !== "mine",
              count: rows.filter((r) => r.status === "WAITING").length,
            },
            {
              to: `${home}?tab=mine`,
              label: "Assigned to me",
              Icon: IconHandRaised,
              activeWhen: onHome && mentorTab === "mine",
              count: rows.filter(
                (r) =>
                  r.mentorId === session.memberId &&
                  ["CLAIMED", "IN_PROGRESS"].includes(r.status),
              ).length,
            },
          ]
        : [
            { to: home, label: "Event overview", Icon: IconChart, end: true },
            {
              to: `${home}#participants`,
              label: "Participants",
              Icon: IconUsers,
            },
            { to: `${home}#mentors`, label: "Mentors", Icon: IconHandRaised },
            { to: `${home}#requests`, label: "All requests", Icon: IconTable },
          ];

  return (
    <div className={own.shell}>
      <div className={own.topbar}>
        <button
          type="button"
          className={own.menuButton}
          aria-expanded={open}
          aria-controls={navId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose size={18} /> : <IconMenu size={18} />}
          Menu
        </button>
        <span className={own.topbarTitle}>
          {eventName}
          <span>
            {session.displayName} · {session.role.toLowerCase()}
          </span>
        </span>
      </div>

      <aside
        id={navId}
        className={`${own.sidebar} ${open ? own.sidebarOpen : ""}`}
        aria-label="Event navigation"
      >
        <Link to="/" className={own.brand} aria-label="DevSOS home">
          <Logo size={32} />
        </Link>

        <div className={own.eventCard}>
          <strong className={own.eventName}>{eventName}</strong>
          <span className={own.eventMeta}>Code {session.eventCode}</span>
          <div className={own.pills}>
            <span className={own.pill}>{session.role.toLowerCase()}</span>
            <span
              className={`${own.pill} ${isOpen ? own.pillOpen : own.pillClosed}`}
            >
              {isOpen ? "open" : "closed"}
            </span>
          </div>
        </div>

        <nav className={own.navGroup} aria-label="Event sections">
          <p className={own.navLabel}>This event</p>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                (item.activeWhen ?? (isActive && !item.to.includes("#")))
                  ? `${own.navLink} ${own.navLinkActive}`
                  : own.navLink
              }
            >
              <item.Icon size={18} />
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className={own.navCount}>{item.count}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <nav className={own.navGroup} aria-label="Support">
          <p className={own.navLabel}>Support</p>
          <Link className={own.navLink} to="/faq">
            <IconInbox size={18} />
            Questions
          </Link>
          <Link
            className={own.navLink}
            to={
              session.role === "MENTOR"
                ? "/for-mentors"
                : session.role === "ORGANIZER"
                  ? "/for-organizers"
                  : "/how-it-works"
            }
          >
            <IconPen size={18} />
            {session.role === "PARTICIPANT" ? "How it works" : "Your guide"}
          </Link>
        </nav>

        <div className={own.sidebarFoot}>
          <p className={own.who}>
            <strong>{session.displayName}</strong>
            {session.tableLabel ? `Table ${session.tableLabel}` : "No table set"}
          </p>
          <button
            type="button"
            className={own.leave}
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: () => navigate("/join", { replace: true }),
              })
            }
          >
            <IconPower size={18} />
            {logout.isPending ? "Leaving…" : "Leave event"}
          </button>
        </div>
      </aside>

      <div className={own.content}>
        <main id="main" className={own.main}>
          {USE_MOCK && (
            <p className={css.demo}>
              Demo mode · Simulated event data. Only your demo session is saved;
              requests reset on a full reload.
            </p>
          )}
          {logout.error && <Alert error={logout.error} />}
          {!isOpen && (
            <p className={css.banner} role="status">
              This event is closed. Requests are read-only.
            </p>
          )}
          {info.isError && (
            <div className={css.banner}>
              Event information could not refresh. Showing session information.{" "}
              <button type="button" onClick={() => void info.refetch()}>
                Retry
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
