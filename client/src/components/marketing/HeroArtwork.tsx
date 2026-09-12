import type { PointerEvent } from "react";
import { useReducedMotion } from "../../hooks/useMotion";
import css from "./HeroArtwork.module.css";

/** Decorative SVG responds to the pointer without moving any interactive controls. */
export default function HeroArtwork() {
  const reduced = useReducedMotion();
  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--art-x", `${((event.clientX - rect.left) / rect.width - .5) * 18}px`);
    event.currentTarget.style.setProperty("--art-y", `${((event.clientY - rect.top) / rect.height - .5) * 12}px`);
  }
  return <div className={css.art} aria-hidden="true" onPointerMove={move} onPointerLeave={event => { event.currentTarget.style.setProperty("--art-x", "0px"); event.currentTarget.style.setProperty("--art-y", "0px"); }}>
    <svg viewBox="0 0 420 110" fill="none">
      <g className={css.orbit}><ellipse cx="70" cy="56" rx="53" ry="22" stroke="#8d50d9" strokeWidth="3" transform="rotate(-25 70 56)"/><ellipse cx="70" cy="56" rx="53" ry="22" stroke="#8d50d9" strokeWidth="3" transform="rotate(35 70 56)"/><circle cx="70" cy="56" r="13" fill="#00004e"/></g>
      <path className={css.connector} d="M129 56h41l17-18 24 36 18-18h38" stroke="#aaa0c5" strokeWidth="2" strokeDasharray="5 7"/>
      <g className={css.spark}><path d="m317 13 9 25 25-10-10 25 26 10-26 9 10 25-25-10-9 25-10-25-25 10 10-25-25-9 25-10-10-25 25 10z" fill="#9cdd2e"/><path d="m306 60 8 8 15-17" stroke="#00004e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></g>
      <circle cx="389" cy="28" r="5" fill="#9c51e8"/>
    </svg>
  </div>;
}
