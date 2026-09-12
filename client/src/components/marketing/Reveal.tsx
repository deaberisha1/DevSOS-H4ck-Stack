import type { ReactNode } from "react";
import { useInView } from "../../hooks/useMotion";
import css from "../../styles/marketing.module.css";

/**
 * Fades its children up the first time they scroll into view. Purely
 * decorative: with reduced motion, or without IntersectionObserver, the
 * content is simply there from the start.
 */
export default function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const classes = [css.reveal, inView ? css.revealed : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className={classes} style={{ transitionDelay: `${delayMs}ms` }}>
      {children}
    </div>
  );
}
