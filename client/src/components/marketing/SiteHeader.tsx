import { useEffect, useId, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useSession } from "../../hooks/useSession";
import { homePathFor } from "../../shared/navigation";
import Logo from "../brand/Logo";
import { IconArrowRight, IconClose, IconMenu } from "../icons";
import shared from "../../styles/marketing.module.css";
import css from "./SiteHeader.module.css";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/for-mentors", label: "For mentors" },
  { to: "/for-organizers", label: "For organizers" },
  { to: "/faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const navId = useId();
  const location = useLocation();
  const { data: session } = useSession();

  // Any navigation closes the mobile panel.
  useEffect(() => setOpen(false), [location.pathname]);

  // Escape closes it too, so keyboard users are never trapped in the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // How far down the page you are. Decorative only — hidden from assistive
  // technology, and it never conveys anything the page does not already say.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  const ctaHref = session ? homePathFor(session) : "/join";
  const ctaLabel = session ? "Go to your event" : "Join an event";

  return (
    <header className={css.header}>
      <div className={shared.container}>
        <div className={css.bar}>
          <Link to="/" className={css.brand} aria-label="DevSOS home">
            <Logo size={38} />
          </Link>

          <button
            type="button"
            className={css.toggle}
            aria-expanded={open}
            aria-controls={navId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose size={20} /> : <IconMenu size={20} />}
            Menu
          </button>

          <nav
            id={navId}
            className={open ? `${css.nav} ${css.navOpen}` : css.nav}
            aria-label="Main"
          >
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  isActive ? `${css.link} ${css.linkActive}` : css.link
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && <span className="visually-hidden"> (current page)</span>}
                  </>
                )}
              </NavLink>
            ))}
            <Link to={ctaHref} className={css.cta}>
              {ctaLabel}
              <IconArrowRight size={18} />
            </Link>
          </nav>
        </div>
      </div>

      <div
        className={css.progress}
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
    </header>
  );
}

