import { Link } from "react-router-dom";
import Logo from "../brand/Logo";
import { IconArrowRight } from "../icons";
import shared from "../../styles/marketing.module.css";
import css from "./SiteFooter.module.css";

const COLUMNS: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  {
    title: "Product",
    links: [
      { to: "/how-it-works", label: "How it works" },
      { to: "/for-mentors", label: "For mentors" },
      { to: "/for-organizers", label: "For organizers" },
    ],
  },
  {
    title: "Get started",
    links: [
      { to: "/join", label: "Join an event" },
      { to: "/faq", label: "FAQ" },
      { to: "/accessibility", label: "Accessibility" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className={css.footer}>
      <div className={shared.container}>
        <div className={css.grid}>
          <div className={css.about}>
            <Logo size={30} className={css.brand} />
            <p className={css.blurb}>
              The help queue for hackathons. Participants ask once, mentors pick up
              what matches their skills, organizers see where the room is stuck.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className={css.colTitle}>{col.title}</h2>
              <ul className={css.list}>
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link className={css.link} to={link.to}>
                      <IconArrowRight size={15} className={css.linkIcon} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={css.bottom}>
          <p style={{ margin: 0 }}>Built for hackathon organizers who are tired of raised hands.</p>
          <p style={{ margin: 0 }}>No accounts. No tracking. Sessions end when the event closes.</p>
        </div>
      </div>
    </footer>
  );
}
