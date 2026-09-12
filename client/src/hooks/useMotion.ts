import { useEffect, useRef, useState } from "react";

/** True when the visitor has asked the system for less movement. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Marks an element once it has been scrolled into view. Used for entrance
 * animation only, so if IntersectionObserver is missing (or motion is
 * reduced) the element simply starts visible — content never depends on it.
 */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect(); // once seen, stays seen
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

/**
 * Counts up to `target` the first time the element is seen. With reduced
 * motion the final number is rendered straight away.
 */
export function useCountUp(target: number, durationMs = 1100) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      // Ease-out so it settles rather than stopping dead.
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, target, durationMs]);

  return { ref, value };
}

/**
 * Re-renders on an interval so elapsed-time labels stay honest without every
 * component owning a timer. Returns the current clock reading in ms.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
