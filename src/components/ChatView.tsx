import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { Chat, Status } from "../lib/types";
import MessageItem from "./MessageItem";

interface Props {
  chat: Chat;
  status: Status;
  skeleton: boolean;
  onSkeletonDone: () => void;
  onRegenerate: () => void;
  onFeedback: (id: string, v: "up" | "down" | null) => void;
}

function SkeletonMessages() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading conversation">
      <div className="flex justify-end">
        <div className="skeleton h-12 w-[55%] rounded-[24px]" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton hidden h-9 w-9 shrink-0 rounded-2xl sm:block" />
        <div className="flex-1 space-y-2.5 rounded-[26px] border border-soul/15 bg-white/[0.02] p-5">
          <div className="skeleton h-3.5 w-[92%]" />
          <div className="skeleton h-3.5 w-[78%]" />
          <div className="skeleton h-3.5 w-[60%]" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="skeleton h-10 w-[38%] rounded-[24px]" />
      </div>
    </div>
  );
}

export default function ChatView({ chat, status, skeleton, onSkeletonDone, onRegenerate, onFeedback }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const generating = status !== "idle";

  const toBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // skeleton → content
  useEffect(() => {
    if (!skeleton) return;
    const t = setTimeout(onSkeletonDone, 380);
    return () => clearTimeout(t);
  }, [skeleton, onSkeletonDone]);

  useLayoutEffect(() => {
    stick.current = true;
    toBottom();
  }, [skeleton, toBottom]);

  // follow growing content while the user is pinned to the bottom
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => {
      if (stick.current) toBottom();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [toBottom, skeleton]);

  // a new message always scrolls into view
  const count = chat.messages.length;
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) {
      stick.current = true;
      toBottom(true);
    }
    prevCount.current = count;
  }, [count, toBottom]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = d < 90;
    setAtBottom(d < 90);
  };

  const lastIdx = chat.messages.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0"
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto overscroll-contain px-3 sm:px-4"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%)",
        }}
      >
        <div ref={contentRef} role="log" aria-label="Conversation" className="mx-auto w-full max-w-[760px] pb-8 pt-6">
          {skeleton ? (
            <SkeletonMessages />
          ) : (
            <div className="space-y-7">
              {chat.messages.map((m, i) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  index={i}
                  isLast={i === lastIdx}
                  generating={generating}
                  onRegenerate={onRegenerate}
                  onFeedback={onFeedback}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {!atBottom && !skeleton && (
          <motion.button
            initial={{ opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={() => {
              stick.current = true;
              toBottom(true);
            }}
            aria-label="Scroll to bottom"
            className="glass-strong hover-lift absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs text-white/85"
          >
            <ArrowDown size={14} className="text-lilac" />
            {generating ? "SOUL is writing" : "Jump to latest"}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
