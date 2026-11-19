import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import Background from "./components/Background";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import ChatView from "./components/ChatView";
import Composer, { type ComposerHandle } from "./components/Composer";
import SettingsModal from "./components/SettingsModal";
import GoogleIcon from "./components/GoogleIcon";
import SplashEntrance from "./components/SplashEntrance";
import OfflineIndicator from "./components/OfflineIndicator";
import { useAuth } from "./contexts/AuthContext";
import { useChats } from "./hooks/useChats";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { loadSettings, saveSettings } from "./lib/storage";
import type { Attachment, Settings } from "./lib/types";

export default function App() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [localSettings, setLocalSettings] = useState<Settings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [loginRequiredNotice, setLoginRequiredNotice] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return !new URLSearchParams(window.location.search).has("nosplash");
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const composer = useRef<ComposerHandle>(null);

  const {
    user,
    authReady,
    signingIn,
    authError,
    profileSettings,
    signInWithGoogle,
    signOutUser,
    saveUserProfileSettings,
    clearAuthError,
  } = useAuth();

  const settings = user && profileSettings ? profileSettings : localSettings;

  const {
    chats,
    active,
    activeId,
    status,
    syncLoading,
    send,
    stop,
    regenerate,
    newChat,
    select,
    rename,
    remove,
    clearAll,
    feedback,
  } = useChats(settings, user, authReady);

  const [skeletonId, setSkeletonId] = useState<string | null>(activeId);

  // brief skeleton while waking the history list
  useEffect(() => {
    const t = setTimeout(() => setHistoryLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  // collapse the drawer when crossing to mobile, open it when crossing to desktop
  const wasDesktop = useRef(isDesktop);
  useEffect(() => {
    if (wasDesktop.current !== isDesktop) setSidebarOpen(isDesktop);
    wasDesktop.current = isDesktop;
  }, [isDesktop]);

  const closeOnMobile = useCallback(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  const handleNew = useCallback(() => {
    newChat();
    closeOnMobile();
    setTimeout(() => composer.current?.focus(), 60);
  }, [newChat, closeOnMobile]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== activeId) setSkeletonId(id);
      select(id);
      closeOnMobile();
    },
    [select, activeId, closeOnMobile],
  );

  const handleSaveSettings = (s: Settings) => {
    if (user) {
      void saveUserProfileSettings(s);
    } else {
      setLocalSettings(s);
      saveSettings(s);
    }
  };

  const closeSettings = useCallback(() => setShowSettings(false), []);
  const finishSplash = useCallback(() => setShowSplash(false), []);
  const skeletonDone = useCallback(() => setSkeletonId(null), []);

  useEffect(() => {
    if (user) setLoginRequiredNotice(false);
  }, [user]);

  const handleSend = useCallback(
    (text: string, attachments: Attachment[] = []) => {
      if (!user) {
        setLoginRequiredNotice(true);
        return false;
      }
      setLoginRequiredNotice(false);
      void send(text, attachments);
      return true;
    },
    [user, send],
  );

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNew();
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.key === "/" && !typing && !mod) {
        e.preventDefault();
        composer.current?.focus();
      } else if (e.key === "Escape" && status !== "idle" && !showSettings) {
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNew, status, stop, showSettings]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-dvh w-full overflow-hidden text-white">
        <Background />

        <div className="relative z-10 flex h-full w-full">
          <Sidebar
            open={sidebarOpen}
            isDesktop={isDesktop}
            loading={historyLoading || syncLoading}
            chats={chats}
            activeId={activeId}
            settings={settings}
            user={user}
            signingIn={signingIn}
            onSignIn={() => void signInWithGoogle()}
            onSignOut={() => void signOutUser()}
            onClose={() => setSidebarOpen(false)}
            onSelect={handleSelect}
            onNew={handleNew}
            onRename={rename}
            onDelete={remove}
            onOpenSettings={() => {
              setShowSettings(true);
              closeOnMobile();
            }}
          />

          <main className="relative flex h-full min-w-0 flex-1 flex-col">
            <TopBar
              sidebarOpen={sidebarOpen}
              thinking={status !== "idle"}
              user={user}
              signingIn={signingIn}
              onSignIn={() => void signInWithGoogle()}
              onSignOut={() => void signOutUser()}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
              onNewChat={handleNew}
            />

            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  role="alert"
                  className="mx-auto mb-1 flex max-w-md items-center gap-2.5 rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-xs text-rose-100 backdrop-blur-md"
                >
                  <AlertTriangle size={15} className="shrink-0 text-rose-300" />
                  <span className="flex-1">{authError}</span>
                  <button
                    onClick={clearAuthError}
                    aria-label="Dismiss auth error"
                    className="rounded-lg p-1 text-rose-200/70 hover:bg-white/10 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                {active ? (
                  <ChatView
                    key={active.id}
                    chat={active}
                    status={status}
                    skeleton={skeletonId === active.id}
                    onSkeletonDone={skeletonDone}
                    onRegenerate={regenerate}
                    onFeedback={feedback}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 overflow-y-auto"
                  >
                    <EmptyState onPick={(text) => void handleSend(text)} name={user?.displayName || settings.displayName} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {loginRequiredNotice && !user && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  role="alert"
                  className="mx-auto mb-2 w-full max-w-[760px] px-3 sm:px-4"
                >
                  <div className="glass-strong flex items-center justify-between gap-3 rounded-2xl border border-lilac/35 bg-soul/15 px-4 py-2.5 text-sm text-white shadow-[0_8px_28px_-10px_rgba(138,92,246,0.65)]">
                    <span className="font-medium text-white">Log in first to continue</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        disabled={signingIn}
                        className="hover-lift flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-soul to-nebula px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        <GoogleIcon size={14} />
                        {signingIn ? "Signing in…" : "Sign in with Google"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginRequiredNotice(false)}
                        aria-label="Dismiss login prompt"
                        className="rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Composer handleRef={composer} generating={status !== "idle"} onSend={handleSend} onStop={stop} />
          </main>
        </div>

        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              key="settings"
              settings={settings}
              chatCount={chats.length}
              user={user}
              signingIn={signingIn}
              onSignIn={() => void signInWithGoogle()}
              onSignOut={() => void signOutUser()}
              onSave={handleSaveSettings}
              onClearAll={clearAll}
              onClose={closeSettings}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSplash && <SplashEntrance key="splash" onComplete={finishSplash} />}
        </AnimatePresence>

        <OfflineIndicator />
      </div>
    </MotionConfig>
  );
}
