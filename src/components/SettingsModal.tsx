import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Trash2, X } from "lucide-react";
import type { Settings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/models";
import { cn } from "../utils/cn";

interface Props {
  settings: Settings;
  chatCount: number;
  onSave: (s: Settings) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const field =
  "w-full rounded-2xl border border-soul/20 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition-all duration-200 focus:border-lilac/60 focus:bg-soul/10 focus:shadow-[0_0_0_3px_rgba(138,92,246,0.18)]";

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.22em] text-lilac/70">
      {children}
    </label>
  );
}

export default function SettingsModal({ settings, chatCount, onSave, onClearAll, onClose }: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    onSave({ ...draft, displayName: draft.displayName.trim() || "Guest" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="glass-strong relative flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px]"
      >
        <div className="flex items-center justify-between border-b border-soul/15 px-6 py-4">
          <h2 id="settings-title" className="font-display text-sm uppercase tracking-[0.3em] text-white">
            Settings
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close settings"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          <div>
            <Label htmlFor="name">Your name</Label>
            <input id="name" className={field} value={draft.displayName} maxLength={30} onChange={(e) => set("displayName", e.target.value)} />
          </div>

          <div>
            <p className="mb-1.5 font-display text-[10px] uppercase tracking-[0.22em] text-lilac/70">Intelligence source</p>
            <div role="radiogroup" aria-label="Intelligence source" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-soul/20 bg-black/20 p-1.5">
              {(
                [
                  ["demo", "Demo mode", "Simulated streaming"],
                  ["api", "Live API", "OpenAI-compatible"],
                ] as const
              ).map(([id, title, sub]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={draft.mode === id}
                  onClick={() => set("mode", id)}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-left transition-all duration-300",
                    draft.mode === id
                      ? "bg-gradient-to-br from-soul/60 to-nebula/40 text-white shadow-[0_6px_22px_-8px_rgba(138,92,246,0.9)]"
                      : "text-white/55 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={cn("space-y-4 transition-opacity duration-300", draft.mode === "demo" && "pointer-events-none opacity-40")} aria-disabled={draft.mode === "demo"}>
            <div>
              <Label htmlFor="endpoint">Endpoint URL</Label>
              <input id="endpoint" className={field} value={draft.endpoint} placeholder={DEFAULT_SETTINGS.endpoint} onChange={(e) => set("endpoint", e.target.value)} disabled={draft.mode === "demo"} />
            </div>
            <div>
              <Label htmlFor="key">API key</Label>
              <div className="relative">
                <input
                  id="key"
                  className={cn(field, "pr-12")}
                  type={showKey ? "text" : "password"}
                  value={draft.apiKey}
                  placeholder="sk-…"
                  autoComplete="off"
                  onChange={(e) => set("apiKey", e.target.value)}
                  disabled={draft.mode === "demo"}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-white/35">Stored only in this browser's localStorage.</p>
            </div>
            <div>
              <Label htmlFor="model">Model ID override (optional)</Label>
              <input id="model" className={field} value={draft.apiModelOverride} placeholder="e.g. gpt-4o, llama-3.1-70b…" onChange={(e) => set("apiModelOverride", e.target.value)} disabled={draft.mode === "demo"} />
            </div>
          </div>

          <div>
            <Label htmlFor="sys">System prompt</Label>
            <textarea id="sys" rows={3} className={cn(field, "resize-none")} value={draft.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] px-4 py-3">
            <div>
              <p className="text-sm text-white/85">Clear all conversations</p>
              <p className="text-xs text-white/40">{chatCount} saved chat{chatCount === 1 ? "" : "s"}</p>
            </div>
            <button
              onClick={() => {
                if (confirmClear) {
                  onClearAll();
                  setConfirmClear(false);
                } else {
                  setConfirmClear(true);
                  setTimeout(() => setConfirmClear(false), 3500);
                }
              }}
              disabled={chatCount === 0}
              className="flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-sm text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-30"
            >
              <Trash2 size={15} />
              {confirmClear ? "Really clear?" : "Clear"}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-soul/15 px-6 py-4">
          <button onClick={onClose} className="rounded-2xl px-5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
            Cancel
          </button>
          <button
            onClick={save}
            className="hover-lift rounded-2xl bg-gradient-to-br from-soul to-nebula px-6 py-2.5 text-sm font-medium text-white shadow-[0_8px_26px_-8px_rgba(138,92,246,0.9)]"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
