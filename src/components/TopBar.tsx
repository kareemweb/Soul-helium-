import { LogOut, PanelLeft, SquarePen } from "lucide-react";
import type { User } from "firebase/auth";
import { SoulMark } from "./Logo";
import ModelSelector from "./ModelSelector";
import GoogleIcon from "./GoogleIcon";
import PWAInstallButton from "./PWAInstallButton";

interface Props {
  sidebarOpen: boolean;
  thinking: boolean;
  user: User | null;
  signingIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const iconBtn =
  "glass hover-lift grid h-10 w-10 place-items-center rounded-2xl text-white/70 hover:text-white";

export default function TopBar({
  sidebarOpen,
  thinking,
  user,
  signingIn,
  onSignIn,
  onSignOut,
  onToggleSidebar,
  onNewChat,
}: Props) {
  return (
    <header className="relative z-30 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          title="Toggle sidebar (Ctrl/⌘ + B)"
          className={iconBtn}
        >
          <PanelLeft size={19} />
        </button>
        <div className="flex items-center gap-2.5" aria-label="SOUL">
          <SoulMark size={30} thinking={thinking} glow={false} className="h-[30px] w-auto" />
          <span
            className="hidden font-display text-[13px] font-medium uppercase text-white/90 md:inline"
            style={{ letterSpacing: "0.45em" }}
          >
            SOUL
          </span>
        </div>
      </div>

      <ModelSelector />

      <div className="flex items-center justify-end gap-2">
        <PWAInstallButton />
        {user ? (
          <div className="glass hidden h-10 items-center gap-2 rounded-2xl pl-1.5 pr-1.5 sm:flex">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User avatar"}
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-xl object-cover"
              />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-soul to-nebula font-display text-xs font-semibold text-white">
                {(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="max-w-[110px] truncate text-xs text-white/80">
              {user.displayName || user.email}
            </span>
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="grid h-7 w-7 place-items-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            disabled={signingIn}
            aria-label="Sign in with Google"
            className="glass hover-lift flex h-10 items-center gap-2 rounded-2xl px-3 text-xs font-medium text-white/90 disabled:opacity-60"
          >
            <GoogleIcon size={15} />
            <span className="hidden sm:inline">{signingIn ? "Signing in…" : "Sign in with Google"}</span>
          </button>
        )}

        <button onClick={onNewChat} aria-label="New chat" title="New chat (Ctrl/⌘ + K)" className={iconBtn}>
          <SquarePen size={18} />
        </button>
      </div>
    </header>
  );
}
