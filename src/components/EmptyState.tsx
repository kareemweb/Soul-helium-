import { motion } from "framer-motion";
import { Code2, Compass, Lightbulb, Sparkles } from "lucide-react";
import { SoulMark } from "./Logo";

const SUGGESTIONS = [
  { icon: Sparkles, label: "Explain quantum computing simply", hint: "Make it click" },
  { icon: Code2, label: "Write a Python function that counts word frequency", hint: "Code with me" },
  { icon: Compass, label: "Plan a calm 3-day trip to Kyoto", hint: "Wander well" },
  { icon: Lightbulb, label: "Brainstorm names for a new product", hint: "Spark ideas" },
];

export default function EmptyState({ onPick, name }: { onPick: (text: string) => void; name: string }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col items-center justify-center px-5 py-6 text-center sm:py-10">
      {/* floating, glowing logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center"
      >
        <div className="relative animate-float">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full animate-halo"
            style={{ background: "radial-gradient(circle, rgba(138,92,246,0.38) 0%, rgba(107,139,255,0.12) 45%, transparent 70%)" }}
          />
          <SoulMark size={110} className="relative h-[72px] w-auto sm:h-[110px]" />
        </div>
        <h1
          className="mt-4 font-display text-[26px] sm:mt-6 font-medium uppercase text-white sm:text-[34px]"
          style={{ letterSpacing: "0.55em", marginRight: "-0.55em", textShadow: "0 0 28px rgba(138,92,246,0.7)" }}
        >
          SOUL
        </h1>
        <p
          className="mt-3 font-display text-[10px] uppercase text-lilac/70 sm:text-[11px]"
          style={{ letterSpacing: "0.42em", marginRight: "-0.42em" }}
        >
          Intelligence Beyond Limits
        </p>
        <div
          aria-hidden
          className="mt-4 h-px w-56 sm:w-72"
          style={{ background: "linear-gradient(90deg, transparent, #8A5CF6, #B89BFF, #8A5CF6, transparent)", boxShadow: "0 0 14px 1px rgba(138,92,246,0.8)" }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-gradient mt-7 font-display sm:mt-10 text-[22px] font-medium leading-snug sm:text-[28px]"
      >
        What's on your mind{name && name !== "Guest" ? `, ${name}` : ""}?
      </motion.h2>

      <ul className="mt-6 grid w-full sm:mt-8 grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.li
            key={s.label}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.55 + i * 0.09 }}
          >
            <button
              onClick={() => onPick(s.label)}
              className="glass hover-lift group flex w-full items-center gap-3.5 rounded-[22px] px-4 py-3 sm:py-3.5 text-left hover:border-lilac/40"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-soul/30 to-nebula/20 text-lilac transition-transform duration-300 group-hover:scale-110 group-hover:text-white">
                <s.icon size={19} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-lilac/60">{s.hint}</span>
                <span className="mt-0.5 block text-[14px] leading-snug text-white/85">{s.label}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
