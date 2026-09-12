import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Logo from "../brand/Logo";
import { useLogout } from "../../hooks/useSession";
import { useEventInfo, useEventSession } from "../../hooks/useEvent";
import { homePathFor } from "../../shared/navigation";
import { USE_MOCK } from "../../api/client";
import { Alert, css } from "./UI";
export default function EventLayout() {
  const session = useEventSession();
  const info = useEventInfo();
  const logout = useLogout();
  const navigate = useNavigate();
  const home = homePathFor(session);
  return (
    <div className={css.app}>
      <header className={css.header}>
        <Link to="/" aria-label="DevSOS home">
          <Logo size={36} />
        </Link>
        <nav aria-label="Event navigation">
          <NavLink to={home} end>
            {session.role === "MENTOR"
              ? "Mentor queue"
              : session.role === "ORGANIZER"
                ? "Event overview"
                : "My requests"}
          </NavLink>
          {session.role === "PARTICIPANT" && session.eventStatus === "OPEN" && (
            <NavLink to={`${home}/new`}>Ask for help</NavLink>
          )}
          <Link to="/faq">Help</Link>
        </nav>
        <button
          type="button"
          disabled={logout.isPending}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => navigate("/join", { replace: true }),
            })
          }
        >
          {logout.isPending ? "Leaving…" : "Leave event"}
        </button>
      </header>
      <div className={css.eventBar}>
        <span>
          <strong>
            {info.data?.name ||
              session.eventName ||
              `Event ${session.eventCode}`}
          </strong>{" "}
          · {session.displayName}
        </span>
        <span>
          {session.role.toLowerCase()} · {session.eventStatus.toLowerCase()}
        </span>
      </div>
      <main id="main" className={css.main}>
        {USE_MOCK && (
          <p className={css.demo}>
            Demo mode · Simulated event data. Only your demo session is saved;
            requests reset on a full reload.
          </p>
        )}
        {logout.error && <Alert error={logout.error} />}{" "}
        {(session.eventStatus === "CLOSED" ||
          info.data?.status === "CLOSED") && (
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
  );
}
