import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import type { Role } from "./shared/types";
import { homePathFor } from "./shared/navigation";
import { useSession } from "./hooks/useSession";
import MarketingLayout from "./components/marketing/MarketingLayout";
import HomePage from "./pages/marketing/HomePage";
import HowItWorksPage from "./pages/marketing/HowItWorksPage";
import MentorsPage from "./pages/marketing/MentorsPage";
import OrganizersPage from "./pages/marketing/OrganizersPage";
import FaqPage from "./pages/marketing/FaqPage";
import AccessibilityPage from "./pages/marketing/AccessibilityPage";
import JoinPage from "./pages/JoinPage";
import ParticipantHome from "./pages/ParticipantHome";
import RequestForm from "./pages/RequestForm";
import MentorWorkspace from "./pages/MentorWorkspace";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import css from "./styles/marketing.module.css";

export { homePathFor };

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="centered" aria-live="polite">
      <p>{children}</p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <section className={css.section}>
      <div className={css.container}>
        <p className={css.kicker}>404</p>
        <h1 className={css.h2}>That page is not here</h1>
        <p className={css.sub} style={{ maxWidth: "52ch" }}>
          The link may be out of date, or the event it pointed at has closed. If you have an
          event code, you can join from here.
        </p>
        <div className={css.ctaRow}>
          <Link className={css.btnPrimary} to="/join">
            Join an event
          </Link>
          <Link className={css.btnGhost} to="/">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Gate for every event route. The role comes from the server session only —
 * nothing the UI holds can widen it — and the event id in the URL must be the
 * one the session belongs to, so one event never renders another's data.
 */
function RequireRole({ allow }: { allow: Role[] }) {
  const location = useLocation();
  const { e: eventParam } = useParams();
  const { data: session, isPending, isError, error, refetch } = useSession();

  if (isPending) return <FullPageMessage>Checking your session…</FullPageMessage>;

  if (isError) {
    return (
      <main id="main" className="centered">
        <p role="alert">{error.userMessage}</p>
        <button type="button" onClick={() => void refetch()}>
          Try again
        </button>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/join" replace state={{ from: location.pathname, reason: "signed-out" }} />;
  }

  if (eventParam && eventParam !== session.eventId) {
    return <Navigate to={homePathFor(session)} replace />;
  }

  if (!allow.includes(session.role)) {
    return <Navigate to={homePathFor(session)} replace state={{ reason: "forbidden" }} />;
  }

  return <Outlet />;
}

/** Someone already in an event has no reason to sit on the Join screen. */
function RedirectIfJoined() {
  const { data: session, isPending } = useSession();
  if (isPending) return <FullPageMessage>Checking your session…</FullPageMessage>;
  if (session) return <Navigate to={homePathFor(session)} replace />;
  return <JoinPage />;
}

function EventIndexRedirect() {
  const { data: session } = useSession();
  return session ? <Navigate to={homePathFor(session)} replace /> : <Navigate to="/join" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public pages: header, footer, no event data. */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/for-mentors" element={<MentorsPage />} />
        <Route path="/for-organizers" element={<OrganizersPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/join" element={<RedirectIfJoined />} />

      <Route element={<RequireRole allow={["PARTICIPANT"]} />}>
        <Route path="/event/:e" element={<ParticipantHome />} />
        <Route path="/event/:e/new" element={<RequestForm />} />
      </Route>

      <Route element={<RequireRole allow={["MENTOR"]} />}>
        <Route path="/event/:e/mentor" element={<MentorWorkspace />} />
      </Route>

      <Route element={<RequireRole allow={["ORGANIZER"]} />}>
        <Route path="/event/:e/organizer" element={<OrganizerDashboard />} />
      </Route>

      {/* A mentor or organizer hitting a stray event path goes to their own home. */}
      <Route element={<RequireRole allow={["PARTICIPANT", "MENTOR", "ORGANIZER"]} />}>
        <Route path="/event/:e/*" element={<EventIndexRedirect />} />
      </Route>
    </Routes>
  );
}
