import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { SOUL_HELIUM } from "../lib/models";

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Active model: ${SOUL_HELIUM.name}`}
        className="glass hover-lift flex h-10 items-center gap-2 rounded-2xl px-3.5 text-sm text-white/90"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-soul/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-lilac" />
        </span>
        <span className="font-display text-[11px] uppercase tracking-[0.18em]">{SOUL_HELIUM.name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Active model details"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="glass-strong absolute left-1/2 z-40 mt-2 w-[min(18.5rem,calc(100vw-1.5rem))] -translate-x-1/2 origin-top rounded-[22px] p-2"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-soul/20 px-3 py-2.5 text-left">
              <Sparkles size={16} className="shrink-0 text-lilac" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[11px] uppercase tracking-[0.18em] text-white">{SOUL_HELIUM.name}</p>
                <p className="mt-0.5 text-xs text-white/55">{SOUL_HELIUM.description}</p>
              </div>
              <Check size={16} className="shrink-0 text-lilac" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
