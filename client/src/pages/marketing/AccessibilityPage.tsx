import { Link } from "react-router-dom";
import css from "../../styles/marketing.module.css";

export default function AccessibilityPage() {
  return (
    <>
      <header className={css.pageHeader}>
        <div className={css.container}>
          <p className={css.kicker}>Accessibility</p>
          <h1 className={css.h1} style={{ fontSize: "clamp(1.75rem, 5vw, 2.75rem)" }}>
            Built to be usable by everyone in the room
          </h1>
          <p className={css.lede}>
            A help queue that some people cannot use is not a help queue. These are the
            commitments, not aspirations — they are in the build, and they are testable.
          </p>
        </div>
      </header>

      <section className={css.section}>
        <div className={css.container}>
          <div className={css.prose}>
            <h2>Keyboard</h2>
            <ul>
              <li>Every action is reachable and operable with a keyboard alone.</li>
              <li>Focus is always visible — focus rings are never removed.</li>
              <li>A skip link jumps straight past the navigation to the main content.</li>
              <li>The mobile menu closes on Escape, so nobody gets stuck inside it.</li>
            </ul>

            <h2>Screen readers</h2>
            <ul>
              <li>
                Status changes — claimed, in progress, resolved — are announced through a
                polite live region, so you hear that a mentor is coming without hunting for
                it.
              </li>
              <li>Every form field has a real, visible label. No placeholder-as-label.</li>
              <li>
                Error messages are tied to their field, so they are read out with the field
                rather than floating somewhere else on the page.
              </li>
              <li>The current page in the navigation is marked in text, not just visually.</li>
            </ul>

            <h2>Colour and contrast</h2>
            <ul>
              <li>
                Status is always shown as a word plus a colour. Colour alone never carries
                meaning, so the queue reads correctly in greyscale and with any form of
                colour blindness.
              </li>
              <li>Light and dark both follow the system setting.</li>
              <li>Text is sized in relative units and survives browser zoom and larger default fonts.</li>
            </ul>

            <h2>Motion</h2>
            <p>
              Animation is decorative only, and it honours <code>prefers-reduced-motion</code>.
              Nothing moves, flashes or auto-scrolls while you are reading.
            </p>

            <h2>Small screens</h2>
            <p>
              The whole flow works at 360px wide with no horizontal scrolling. Wide layouts
              — queue beside detail panel — only appear from about 900px up, and everything
              below that is one clear scrolling column in reading order. Touch targets are
              at least 44px.
            </p>

            <h2>Language</h2>
            <p>
              Times are elapsed, never predicted: <strong>"Waiting for 4m 12s"</strong> and
              never "about 5 minutes until a mentor arrives". Errors say what happened and
              what to do next, in plain words.
            </p>

            <div className={css.note}>
              Found something that does not work for you at an event? Tell the organizers —
              accessibility bugs in the queue are treated as event-blocking, not as a
              backlog item.
            </div>
          </div>

          <div className={css.ctaRow} style={{ marginTop: "2rem" }}>
            <Link className={css.btnPrimary} to="/join">
              Join an event
            </Link>
            <Link className={css.btnGhost} to="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
