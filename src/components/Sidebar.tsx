import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, Pencil, Plus, Search, Settings as SettingsIcon, Trash2, X } from "lucide-react";
import type { Chat, Settings } from "../lib/types";
import { SoulMark } from "./Logo";
import { cn } from "../utils/cn";

interface Props {
  open: boolean;
  isDesktop: boolean;
  loading: boolean;
  chats: Chat[];
  activeId: string | null;
  settings: Settings;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

const WIDTH = 296;

function groupChats(chats: Chat[]) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const groups: { label: string; items: Chat[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Earlier", items: [] },
  ];
  [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((c) => {
      if (c.updatedAt >= startToday) groups[0].items.push(c);
      else if (c.updatedAt >= startToday - day) groups[1].items.push(c);
      else if (c.updatedAt >= startToday - 7 * day) groups[2].items.push(c);
      else groups[3].items.push(c);
    });
  return groups.filter((g) => g.items.length);
}

function ChatRow({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  onSelect: () => void;
  onRename: (t: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3500);
    return () => clearTimeout(t);
  }, [confirm]);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== chat.title) onRename(t);
    setEditing(false);
  };

  const mini =
    "grid h-7 w-7 place-items-center rounded-lg text-white/50 transition-colors duration-200 hover:bg-white/10 hover:text-white";

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, height: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group/row relative"
    >
      {editing ? (
        <div className="flex items-center gap-1 rounded-2xl border border-lilac/50 bg-soul/10 px-2 py-1.5">
          <input
            ref={inputRef}
            value={draft}
            maxLength={80}
            aria-label="Rename chat"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(chat.title);
                setEditing(false);
              }
            }}
            onBlur={commit}
            className="min-w-0 flex-1 bg-transparent px-1.5 text-sm text-white outline-none"
          />
          <button className={mini} aria-label="Save name" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
            <Check size={14} />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center rounded-2xl border transition-all duration-200 ease-out",
            active
              ? "border-soul/40 bg-gradient-to-r from-soul/25 to-nebula/10 shadow-[0_0_24px_-8px_rgba(138,92,246,0.7)]"
              : "border-transparent hover:border-soul/20 hover:bg-white/[0.04]",
          )}
        >
          <button
            onClick={onSelect}
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left"
          >
            <MessageSquare size={15} className={cn("shrink-0", active ? "text-lilac" : "text-white/35")} />
            <span className={cn("truncate text-sm", active ? "text-white" : "text-white/70")}>{chat.title}</span>
          </button>
          <div
            className={cn(
              "flex shrink-0 items-center gap-0.5 pr-1.5 transition-opacity duration-200",
              confirm ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100",
            )}
          >
            {confirm ? (
              <>
                <span className="px-1 text-xs text-rose-300">Delete?</span>
                <button className={cn(mini, "hover:!bg-rose-500/25 hover:!text-rose-200")} aria-label="Confirm delete" onClick={onDelete}>
                  <Check size={14} />
                </button>
                <button className={mini} aria-label="Cancel delete" onClick={() => setConfirm(false)}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  className={mini}
                  aria-label={`Rename ${chat.title}`}
                  onClick={() => {
                    setDraft(chat.title);
                    setEditing(true);
                  }}
                >
                  <Pencil size={13} />
                </button>
                <button className={mini} aria-label={`Delete ${chat.title}`} onClick={() => setConfirm(true)}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.li>
  );
}

function SidebarContent(props: Props & { showClose: boolean }) {
  const { chats, activeId, loading, settings, onSelect, onNew, onRename, onDelete, onOpenSettings, onClose, showClose } = props;
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(query.trim().toLowerCase())),
    [chats, query],
  );
  const groups = useMemo(() => groupChats(filtered), [filtered]);
  const initials = (settings.displayName || "G").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-full flex-col p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <SoulMark size={28} glow={false} className="h-7 w-auto" />
          <span className="font-display text-[13px] font-medium uppercase text-white/90" style={{ letterSpacing: "0.45em" }}>
            SOUL
          </span>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <button
        onClick={onNew}
        className="hover-lift group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-soul to-nebula font-medium text-white shadow-[0_8px_30px_-8px_rgba(138,92,246,0.8)]"
      >
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
        <Plus size={18} strokeWidth={2.5} />
        <span className="relative text-sm">New chat</span>
      </button>

      <div className="relative mt-3">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="h-10 w-full rounded-2xl border border-soul/15 bg-white/[0.03] pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition-colors duration-200 focus:border-lilac/50 focus:bg-soul/10"
        />
      </div>

      <nav aria-label="Chat history" className="mt-3 -mx-1 flex-1 overflow-y-auto px-1 pb-2">
        {loading ? (
          <div className="space-y-2 pt-2" aria-label="Loading chats" role="status">
            {[78, 62, 88, 54, 70].map((w, i) => (
              <div key={i} className="skeleton h-10" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-10 px-4 text-center text-sm text-white/35">
            {chats.length === 0 ? "Your conversations will appear here." : "No chats match your search."}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.label} className="mb-3">
              <h3 className="px-3 pb-1.5 pt-2 font-display text-[10px] uppercase tracking-[0.25em] text-lilac/45">{g.label}</h3>
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {g.items.map((c) => (
                    <ChatRow
                      key={c.id}
                      chat={c}
                      active={c.id === activeId}
                      onSelect={() => onSelect(c.id)}
                      onRename={(t) => onRename(c.id, t)}
                      onDelete={() => onDelete(c.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </nav>

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-soul/20 bg-white/[0.03] p-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-soul to-nebula font-display text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(138,92,246,0.9)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{settings.displayName || "Guest"}</p>
          <p className="flex items-center gap-1.5 text-xs text-white/40">
            <span className={cn("h-1.5 w-1.5 rounded-full", settings.mode === "api" ? "bg-emerald-400" : "bg-lilac")} />
            {settings.mode === "api" ? "Connected to API" : "Demo mode"}
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="grid h-10 w-10 place-items-center rounded-xl text-white/55 transition-all duration-300 hover:rotate-45 hover:bg-soul/20 hover:text-white"
        >
          <SettingsIcon size={19} />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar(props: Props) {
  const { open, isDesktop, onClose } = props;

  if (isDesktop) {
    return (
      <motion.aside
        initial={false}
        animate={{ width: open ? WIDTH : 0, opacity: open ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        className="relative z-20 h-full shrink-0 overflow-hidden"
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className="glass-strong absolute inset-y-3 left-3 overflow-hidden rounded-[28px]"
          style={{ width: WIDTH - 12 }}
        >
          <SidebarContent {...props} showClose={false} />
        </div>
      </motion.aside>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label="Chat history"
            initial={{ x: "-104%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-104%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="glass-strong absolute inset-y-2 left-2 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px]"
          >
            <SidebarContent {...props} showClose />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
