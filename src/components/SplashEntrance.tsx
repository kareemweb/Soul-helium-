import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onComplete: () => void;
}

const EASE_SOUL: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function SplashEntrance({ onComplete }: Props) {
  const uid = useId().replace(/:/g, "");
  const [fadingMark, setFadingMark] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const markTimer = setTimeout(() => setFadingMark(true), reduced ? 120 : 1750);
    const doneTimer = setTimeout(onComplete, reduced ? 320 : 2100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        onComplete();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(markTimer);
      clearTimeout(doneTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onComplete]);

  return (
    <motion.div
      role="presentation"
      onClick={onComplete}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.38, ease: EASE_SOUL }}
      className="fixed inset-0 z-[100] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden bg-[#0A0A0F] px-6"
    >
      {/* Ambient Deep Indigo & Soul Purple cosmic waves echoing the brand sheet */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(138, 92, 246, 0.24) 0%, rgba(26, 15, 46, 0.55) 38%, rgba(10, 10, 15, 0.98) 76%)",
        }}
      />

      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: fadingMark ? 0 : [0, 0.9, 0.65], scale: fadingMark ? 1.06 : [0.85, 1.08, 1] }}
        transition={{ duration: fadingMark ? 0.32 : 1.5, ease: EASE_SOUL }}
        className="pointer-events-none absolute h-[340px] w-[340px] rounded-full blur-3xl sm:h-[420px] sm:w-[420px]"
        style={{
          background:
            "radial-gradient(circle, rgba(184, 155, 255, 0.28) 0%, rgba(107, 139, 255, 0.14) 45%, transparent 72%)",
        }}
      />

      {/* Animated SOUL ribbon S + star choreography */}
      <motion.div
        animate={{ opacity: fadingMark ? 0 : 1, scale: fadingMark ? 0.96 : 1 }}
        transition={{ duration: 0.3, ease: EASE_SOUL }}
        className="relative flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center">
          {/* Starburst ignition ring */}
          <motion.div
            aria-hidden
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.35, 1.65], opacity: [0, 0.7, 0] }}
            transition={{ delay: 0.45, duration: 0.95, ease: EASE_SOUL }}
            className="pointer-events-none absolute h-28 w-28 rounded-full border border-lilac/60 shadow-[0_0_32px_rgba(184,155,255,0.65)]"
          />

          <svg
            role="img"
            aria-label="SOUL animated logo"
            viewBox="-4 -2 188 248"
            className="h-[118px] w-auto sm:h-[146px]"
            style={{ filter: "drop-shadow(0 0 22px rgba(138, 92, 246, 0.65))" }}
          >
            <defs>
              <linearGradient id={`${uid}-grad`} x1="20" y1="10" x2="150" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#C9B2FF" />
                <stop offset="0.5" stopColor="#8A5CF6" />
                <stop offset="1" stopColor="#4F34C0" />
              </linearGradient>
              <radialGradient id={`${uid}-star`}>
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#CDBBFF" />
              </radialGradient>
            </defs>

            {/* Upper ribbon sweeping in from top-right */}
            <motion.g
              initial={{ opacity: 0, x: 26, y: -26, scale: 0.86 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.72, ease: EASE_SOUL }}
            >
              <path
                fill={`url(#${uid}-grad)`}
                d="M131 3 C 126 30, 92 40, 52 52 C 14 64, 0 98, 26 124 C 40 138, 62 146, 80 152 C 58 138, 44 124, 47 106 C 51 84, 112 74, 128 40 C 131 30, 132 16, 131 3 Z"
              />
              <path fill="#2A1470" opacity="0.52" d="M80 152 C 58 138, 44 124, 47 106 C 49 120, 60 134, 80 152 Z" />
            </motion.g>

            {/* Lower ribbon sweeping in from bottom-left */}
            <motion.g
              initial={{ opacity: 0, x: -26, y: 26, scale: 0.86 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              transition={{ duration: 0.72, delay: 0.08, ease: EASE_SOUL }}
            >
              <g transform="rotate(180 90 120)">
                <path
                  fill={`url(#${uid}-grad)`}
                  d="M131 3 C 126 30, 92 40, 52 52 C 14 64, 0 98, 26 124 C 40 138, 62 146, 80 152 C 58 138, 44 124, 47 106 C 51 84, 112 74, 128 40 C 131 30, 132 16, 131 3 Z"
                />
                <path fill="#2A1470" opacity="0.52" d="M80 152 C 58 138, 44 124, 47 106 C 49 120, 60 134, 80 152 Z" />
              </g>
            </motion.g>

            {/* Central 4-point star igniting */}
            <motion.g
              style={{ transformOrigin: "90px 120px" }}
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: [0, 1.32, 1], rotate: 0 }}
              transition={{ delay: 0.42, duration: 0.65, ease: EASE_SOUL }}
            >
              <path
                fill={`url(#${uid}-star)`}
                d="M90 100 Q92.5 117.5 110 120 Q92.5 122.5 90 140 Q87.5 122.5 70 120 Q87.5 117.5 90 100 Z"
                style={{ filter: "drop-shadow(0 0 10px rgba(230, 218, 255, 1))" }}
              />
            </motion.g>
          </svg>
        </div>

        {/* S O U L wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 14, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.55em" }}
          transition={{ delay: 0.68, duration: 0.62, ease: EASE_SOUL }}
          className="mt-6 font-display text-[32px] font-medium uppercase text-white sm:text-[42px]"
          style={{
            marginRight: "-0.55em",
            textShadow: "0 0 30px rgba(138, 92, 246, 0.78)",
          }}
        >
          SOUL
        </motion.div>

        {/* INTELLIGENCE BEYOND LIMITS + glowing horizon flare matching brand sheet */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.92, duration: 0.55, ease: EASE_SOUL }}
          className="mt-3 font-display text-[10px] uppercase text-lilac/85 sm:text-[12px]"
          style={{ letterSpacing: "0.42em", marginRight: "-0.42em" }}
        >
          Intelligence Beyond Limits
        </motion.p>

        <motion.div
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.02, duration: 0.65, ease: EASE_SOUL }}
          className="relative mt-4 h-px w-64 origin-center sm:w-80"
          style={{
            background: "linear-gradient(90deg, transparent, #8A5CF6, #B89BFF, #8A5CF6, transparent)",
            boxShadow: "0 0 18px 2px rgba(138, 92, 246, 0.9)",
          }}
        >
          <span
            className="absolute left-1/2 top-1/2 h-1.5 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px]"
            style={{ background: "radial-gradient(circle, #ffffff 0%, #B89BFF 50%, transparent 100%)" }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
