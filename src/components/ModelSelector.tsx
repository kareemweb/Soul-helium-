import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { MODELS } from "../lib/models";
import { cn } from "../utils/cn";

export default function ModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = MODELS.find((m) => m.id === value) ?? MODELS[1];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setActive(MODELS.indexOf(current));
        setOpen(true);
      } else setActive((a) => (a + 1) % MODELS.length);
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setActive((a) => (a - 1 + MODELS.length) % MODELS.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      onChange(MODELS[active].id);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKey}>
      <button
        onClick={() => {
          setActive(MODELS.indexOf(current));
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select model"
        className="glass hover-lift flex h-10 items-center gap-2 rounded-2xl pl-3.5 pr-2.5 text-sm text-white/90"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-soul/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-lilac" />
        </span>
        <span className="font-display text-[11px] uppercase tracking-[0.18em]">{current.name}</span>
        <ChevronDown size={16} className={cn("text-white/50 transition-transform duration-300", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Models"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="glass-strong absolute left-1/2 z-40 mt-2 w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 origin-top rounded-[22px] p-1.5"
          >
            {MODELS.map((m, i) => (
              <li key={m.id} role="option" aria-selected={m.id === value}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200",
                    active === i ? "bg-soul/20" : "bg-transparent",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[11px] uppercase tracking-[0.18em] text-white">{m.name}</span>
                    <span className="mt-0.5 block text-xs text-white/50">{m.description}</span>
                  </span>
                  {m.id === value && <Check size={16} className="text-lilac" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
