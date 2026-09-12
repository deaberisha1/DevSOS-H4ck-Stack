/**
 * One stroke-drawn icon set for the whole app. Every icon inherits
 * `currentColor` and the surrounding font size, is decorative by default
 * (`aria-hidden`), and becomes an image with a name only when given a `title`.
 */
import type { ReactNode, SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Pixel size; defaults to 24. */
  size?: number;
  /** Supply only when the icon carries meaning no nearby text carries. */
  title?: string;
}

function Svg({
  size = 24,
  title,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
  </Svg>
);

export const IconTarget = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2.5" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h16" />
    <rect x="5.5" y="11" width="3.5" height="6" rx="1" />
    <rect x="10.5" y="7" width="3.5" height="10" rx="1" />
    <rect x="15.5" y="13" width="3.5" height="4" rx="1" />
  </Svg>
);

export const IconAccessibility = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M5 8.5c4.5 1.6 9.5 1.6 14 0" />
    <path d="M12 8.5v5" />
    <path d="m12 13.5-3 7" />
    <path d="m12 13.5 3 7" />
  </Svg>
);

export const IconHandRaised = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 11V4.8a1.4 1.4 0 0 1 2.8 0V11" />
    <path d="M11.8 10.5V3.9a1.4 1.4 0 0 1 2.8 0V11" />
    <path d="M14.6 11V6.4a1.4 1.4 0 0 1 2.8 0V14a7 7 0 0 1-7 7h-.4a5 5 0 0 1-4.2-2.3L3.6 15a1.5 1.5 0 0 1 2.3-1.8L9 16" />
  </Svg>
);

export const IconRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5A4.5 4.5 0 0 1 8.5 5H19" />
    <path d="m16 2 3 3-3 3" />
    <path d="M20 14.5a4.5 4.5 0 0 1-4.5 4.5H5" />
    <path d="m8 22-3-3 3-3" />
  </Svg>
);

export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconFog = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h10" />
    <path d="M17 8h3" />
    <path d="M4 12h6" />
    <path d="M13 12h7" />
    <path d="M4 16h11" />
    <path d="M18 16h2" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.7 2.7L16 9.5" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h14" />
    <path d="m13 6.5 5.5 5.5L13 17.5" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M17.5 14.4A6 6 0 0 1 21 20" />
  </Svg>
);

export const IconWifiOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 8.5A16 16 0 0 1 8 5.4" />
    <path d="M13.5 5.2a16 16 0 0 1 8 3.3" />
    <path d="M5.5 12.2a11 11 0 0 1 3.2-1.8" />
    <path d="M15.4 10.6a11 11 0 0 1 3.1 1.6" />
    <path d="M9 15.6a6 6 0 0 1 6 0" />
    <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    <path d="m3 3 18 18" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);

export const IconTable = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <path d="M3.5 10h17" />
    <path d="M9.5 10v9" />
  </Svg>
);

export const IconSignal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 15.5v3" />
    <path d="M10 12v6.5" />
    <path d="M14.5 8.5v10" />
    <path d="M19 5v13.5" />
  </Svg>
);

export const IconPen = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4.5 19.5 9.5" />
    <path d="M16.8 2.2a2.4 2.4 0 0 1 3.4 3.4L7.6 18.2 3 21l2.8-4.6L16.8 2.2Z" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5" />
  </Svg>
);

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="12" r="4" />
    <path d="M12 12h9" />
    <path d="M17.5 12v3.5" />
    <path d="M20.5 12v2.5" />
  </Svg>
);

export const IconRelease = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v10" />
    <path d="m8 7 4-4 4 4" />
    <path d="M4.5 13v5A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5v-5" />
  </Svg>
);

export const IconPower = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v8" />
    <path d="M17.5 6.8a8 8 0 1 1-11 0" />
  </Svg>
);

export const IconBrain = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5.5a3 3 0 0 0-5.8-1A2.8 2.8 0 0 0 4 7.2a3 3 0 0 0 .6 1.8A3 3 0 0 0 5 15a3 3 0 0 0 3.4 3.4A2.8 2.8 0 0 0 12 19.5V5.5Z" />
    <path d="M12 5.5a3 3 0 0 1 5.8-1A2.8 2.8 0 0 1 20 7.2a3 3 0 0 1-.6 1.8A3 3 0 0 1 19 15a3 3 0 0 1-3.4 3.4A2.8 2.8 0 0 1 12 19.5" />
  </Svg>
);

export const IconClipboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
    <path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7" />
    <path d="M9 11h6" />
    <path d="M9 15h4" />
  </Svg>
);

export const IconWrench = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.5 3.5a5.5 5.5 0 0 0-5 7.7L3.8 17.9a2 2 0 0 0 2.8 2.8l6.7-6.7a5.5 5.5 0 0 0 6.9-7.3l-3 3-2.8-.6-.6-2.8 3-3a5.5 5.5 0 0 0-1.3-.8Z" />
  </Svg>
);

export const IconHourglass = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 3h11" />
    <path d="M6.5 21h11" />
    <path d="M7.5 3v3.2c0 1.1.5 2.2 1.4 2.9L12 12l-3.1 2.9c-.9.7-1.4 1.8-1.4 2.9V21" />
    <path d="M16.5 3v3.2c0 1.1-.5 2.2-1.4 2.9L12 12l3.1 2.9c.9.7 1.4 1.8 1.4 2.9V21" />
  </Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.6 6.2A8.6 8.6 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3 3.4" />
    <path d="M6.3 7.8A15 15 0 0 0 3 12s4 6 9 6a8.7 8.7 0 0 0 3.4-.7" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Svg>
);
