import css from "./Logo.module.css";

/** Original DevSOS mark: code brackets surrounding a rescue cross. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
    <rect width="40" height="40" rx="9" className={css.frame} />
    <path d="m12 12-7 8 7 8m16-16 7 8-7 8" className={css.wave} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 13h4v5h5v4h-5v5h-4v-5h-5v-4h5z" className={css.dot} />
  </svg>;
}
export default function Logo({ size = 36, showWordmark = true, className }: { size?: number; showWordmark?: boolean; className?: string }) {
  return <span className={className ? `${css.logo} ${className}` : css.logo}><LogoMark size={size} className={css.mark} />{showWordmark && <span className={css.wordmark}>dev<span className={css.wordmarkAccent}>sos</span><span className={css.period}>.</span></span>}</span>;
}
