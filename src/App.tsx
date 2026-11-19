import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import Background from "./components/Background";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import EmptyState from "./components/EmptyState";
import ChatView from "./components/ChatView";
import Composer, { type ComposerHandle } from "./components/Composer";
import SettingsModal from "./components/SettingsModal";
import { useChats } from "./hooks/useChats";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { loadModel, loadSettings, saveModel, saveSettings } from "./lib/storage";
import type { Settings } from "./lib/types";

export default function App() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [model, setModel] = useState<string>(() => loadModel());
  const [showSettings, setShowSettings] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const composer = useRef<ComposerHandle>(null);

  const { chats, active, activeId, status, send, stop, regenerate, newChat, select, rename, remove, clearAll, feedback } = useChats(
    settings,
    model,
  );
  const [skeletonId, setSkeletonId] = useState<string | null>(activeId);

  // brief skeleton while "waking" the history list
  useEffect(() => {
    const t = setTimeout(() => setHistoryLoading(false), 650);
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

  const handleModel = (id: string) => {
    setModel(id);
    saveModel(id);
  };

  const handleSaveSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  const closeSettings = useCallback(() => setShowSettings(false), []);
  const skeletonDone = useCallback(() => setSkeletonId(null), []);

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
            loading={historyLoading}
            chats={chats}
            activeId={activeId}
            settings={settings}
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
              model={model}
              onModel={handleModel}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
              onNewChat={handleNew}
            />

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
                    <EmptyState onPick={(text) => send(text)} name={settings.displayName} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Composer handleRef={composer} generating={status !== "idle"} onSend={send} onStop={stop} />
          </main>
        </div>

        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              key="settings"
              settings={settings}
              chatCount={chats.length}
              onSave={handleSaveSettings}
              onClearAll={clearAll}
              onClose={closeSettings}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
