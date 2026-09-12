import { useCountUp } from "../../hooks/useMotion";

/**
 * A figure that counts up the first time it is seen. The full value is in the
 * DOM from the start for assistive technology, so nothing depends on the
 * animation running.
 */
export default function StatNumber({
  value,
  prefix = "",
  suffix = "",
  label,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  /** The complete figure as it should be read out, e.g. "under 60 seconds". */
  label: string;
  className?: string;
}) {
  const { ref, value: shown } = useCountUp(value);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">
        {prefix}
        {shown.toLocaleString()}
        {suffix}
      </span>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
