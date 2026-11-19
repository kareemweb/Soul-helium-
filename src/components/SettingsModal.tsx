import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, LogOut, Sparkles, Trash2, X } from "lucide-react";
import type { User } from "firebase/auth";
import type { Settings } from "../lib/types";
import { LIMITS, sanitizeDisplayName, sanitizeSystemPrompt } from "../lib/chatUtils";
import { DEFAULT_SETTINGS, SOUL_HELIUM } from "../lib/models";
import { usePWAInstall } from "../hooks/usePWAInstall";
import GoogleIcon from "./GoogleIcon";
import { cn } from "../utils/cn";

interface Props {
  settings: Settings;
  chatCount: number;
  user: User | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
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

export default function SettingsModal({
  settings,
  chatCount,
  user,
  signingIn,
  onSignIn,
  onSignOut,
  onSave,
  onClearAll,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [confirmClear, setConfirmClear] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    onSave({
      displayName: sanitizeDisplayName(draft.displayName),
      systemPrompt: sanitizeSystemPrompt(draft.systemPrompt, DEFAULT_SETTINGS.systemPrompt),
    });
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
            <p className="mb-1.5 font-display text-[10px] uppercase tracking-[0.22em] text-lilac/70">Google Account</p>
            {user ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-soul/20 bg-white/[0.04] px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User avatar"}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-soul to-nebula font-display text-sm font-semibold text-white">
                      {(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{user.displayName || "Google User"}</p>
                    <p className="truncate text-xs text-white/50">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onSignOut}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                disabled={signingIn}
                className="hover-lift flex w-full items-center justify-center gap-2.5 rounded-2xl border border-soul/25 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition-colors hover:border-lilac/45 hover:bg-white/10 disabled:opacity-60"
              >
                <GoogleIcon size={17} />
                {signingIn ? "Signing in with Google…" : "Sign in with Google to sync your chats"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-soul/20 bg-soul/[0.08] px-4 py-3">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="shrink-0 text-lilac" />
              <div>
                <p className="font-display text-xs uppercase tracking-[0.18em] text-white">{SOUL_HELIUM.name}</p>
                <p className="text-xs text-white/50">{SOUL_HELIUM.description}</p>
              </div>
            </div>
            <span className="rounded-xl border border-lilac/30 bg-soul/20 px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.16em] text-lilac">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-soul/20 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="Soul app icon" className="h-9 w-9 shrink-0 rounded-xl" />
              <div>
                <p className="font-display text-xs uppercase tracking-[0.18em] text-white">Soul App</p>
                <p className="text-xs text-white/50">
                  {isInstalled
                    ? "Running as an installed standalone app"
                    : isIOS
                      ? "Tap Share → Add to Home Screen in Safari"
                      : isInstallable
                        ? "Install Soul on your device for quick standalone access"
                        : "Use your browser’s Install / Add to Home Screen menu"}
                </p>
              </div>
            </div>
            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={() => void install()}
                className="hover-lift flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-soul to-nebula px-3 py-2 text-xs font-medium text-white"
              >
                <Download size={14} />
                Install
              </button>
            )}
          </div>

          <div>
            <Label htmlFor="name">Your name</Label>
            <input
              id="name"
              className={field}
              value={draft.displayName}
              maxLength={LIMITS.DISPLAY_NAME_MAX}
              onChange={(e) => set("displayName", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="sys">System prompt</Label>
            <textarea
              id="sys"
              rows={3}
              maxLength={LIMITS.SYSTEM_PROMPT_MAX}
              className={cn(field, "resize-none")}
              value={draft.systemPrompt}
              onChange={(e) => set("systemPrompt", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] px-4 py-3">
            <div>
              <p className="text-sm text-white/85">Clear all conversations</p>
              <p className="text-xs text-white/40">
                {chatCount} saved chat{chatCount === 1 ? "" : "s"}
              </p>
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
