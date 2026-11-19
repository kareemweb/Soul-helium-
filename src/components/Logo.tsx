import { useId } from "react";
import { cn } from "../utils/cn";

interface MarkProps {
  size?: number;
  thinking?: boolean;
  glow?: boolean;
  className?: string;
}

/** The SOUL mark: a flowing purple ribbon "S" with a four-point sparkle at its heart. */
export function SoulMark({ size = 48, thinking = false, glow = true, className }: MarkProps) {
  const id = useId().replace(/:/g, "");
  const w = (size * 170) / 240;
  return (
    <svg
      role="img"
      aria-label="SOUL"
      viewBox="-4 -2 188 248"
      width={w}
      height={size}
      className={cn(thinking && "soul-thinking", className)}
      style={glow ? { filter: "drop-shadow(0 0 14px rgba(138,92,246,0.55))" } : undefined}
    >
      <defs>
        <linearGradient id={`${id}a`} x1="20" y1="10" x2="150" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C9B2FF" />
          <stop offset="0.5" stopColor="#8A5CF6" />
          <stop offset="1" stopColor="#4F34C0" />
        </linearGradient>
        <radialGradient id={`${id}s`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#CDBBFF" />
        </radialGradient>
      </defs>
      <g id={`${id}p`}>
        <path
          fill={`url(#${id}a)`}
          d="M131 3 C 126 30, 92 40, 52 52 C 14 64, 0 98, 26 124 C 40 138, 62 146, 80 152 C 58 138, 44 124, 47 106 C 51 84, 112 74, 128 40 C 131 30, 132 16, 131 3 Z"
        />
        <path fill="#2A1470" opacity="0.5" d="M80 152 C 58 138, 44 124, 47 106 C 49 120, 60 134, 80 152 Z" />
      </g>
      <use href={`#${id}p`} transform="rotate(180 90 120)" />
      {/* the star: pulses gently, spins faster while thinking */}
      <g className="soul-star-spin">
        <g className="soul-star-pulse">
          <path
            fill={`url(#${id}s)`}
            d="M90 100 Q92.5 117.5 110 120 Q92.5 122.5 90 140 Q87.5 122.5 70 120 Q87.5 117.5 90 100 Z"
            style={{ filter: "drop-shadow(0 0 6px rgba(230,218,255,0.95))" }}
          />
        </g>
      </g>
    </svg>
  );
}

interface LogoProps extends MarkProps {
  wordmark?: boolean;
  /** layout: stacked (mark above wordmark) or horizontal */
  layout?: "stacked" | "horizontal";
  wordSize?: number;
}

export function SoulLogo({ size = 96, thinking, glow, wordmark = true, layout = "stacked", wordSize, className }: LogoProps) {
  const ws = wordSize ?? Math.max(12, Math.round(size * 0.3));
  return (
    <div
      className={cn("flex items-center", layout === "stacked" ? "flex-col gap-4" : "flex-row gap-3", className)}
    >
      <SoulMark size={size} thinking={thinking} glow={glow} />
      {wordmark && (
        <span
          className="font-display font-medium uppercase text-white/95 select-none"
          style={{
            fontSize: ws,
            letterSpacing: "0.55em",
            marginRight: layout === "stacked" ? "-0.55em" : 0,
            textShadow: "0 0 24px rgba(138,92,246,0.55)",
          }}
        >
          SOUL
        </span>
      )}
    </div>
  );
}
