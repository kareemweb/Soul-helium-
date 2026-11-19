import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Copy, FileText, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Message } from "../lib/types";
import { SoulMark } from "./Logo";
import Markdown from "./Markdown";
import TypingIndicator from "./TypingIndicator";
import { copyText } from "../utils/clipboard";
import { cn } from "../utils/cn";

interface Props {
  message: Message;
  index: number;
  isLast: boolean;
  generating: boolean;
  onRegenerate: () => void;
  onFeedback: (id: string, value: "up" | "down" | null) => void;
}

const spring = { type: "spring", stiffness: 340, damping: 30, mass: 0.9 } as const;

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-xl text-white/45 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-soul/20 hover:text-white hover:shadow-[0_6px_16px_-6px_rgba(138,92,246,0.7)]",
        active && "bg-soul/25 text-lilac",
      )}
    >
      {children}
    </button>
  );
}

const actionsVis =
  "opacity-0 transition-opacity duration-300 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 [@media(hover:none)]:opacity-100";

export default function MessageItem({ message, index, isLast, generating, onRegenerate, onFeedback }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const streaming = !isUser && isLast && generating;
  const waiting = streaming && message.content === "";

  const doCopy = async () => {
    if (await copyText(message.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const CopyIcon = copied ? Check : Copy;

  if (isUser) {
    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spring, delay: Math.min(index * 0.03, 0.2) }}
        className="group/msg flex items-end justify-end gap-2"
      >
        <div className={cn("pb-1", actionsVis)}>
          <ActionButton label={copied ? "Copied" : "Copy message"} onClick={doCopy}>
            <CopyIcon size={15} />
          </ActionButton>
        </div>
        <div
          className="max-w-[88%] whitespace-pre-wrap break-words rounded-[24px] rounded-br-lg px-5 py-3 text-[15.5px] leading-relaxed text-white shadow-[0_10px_34px_-10px_rgba(138,92,246,0.75)] sm:max-w-[80%]"
          style={{ background: "linear-gradient(135deg, #8A5CF6 0%, #7A70F8 55%, #6B8BFF 100%)" }}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn("flex flex-wrap gap-1.5", message.content && "mb-2")}>
              {message.attachments.map((a) => (
                <span key={a.id} className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-black/25 px-2.5 py-1 text-xs text-white/90">
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate max-w-[180px]">{a.name}</span>
                </span>
              ))}
            </div>
          )}
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: Math.min(index * 0.03, 0.2) }}
      className="group/msg flex items-start gap-3"
    >
      <div className="mt-1 hidden h-9 w-9 shrink-0 place-items-center rounded-2xl border border-soul/25 bg-deep/70 sm:grid">
        <SoulMark size={22} glow={false} thinking={streaming} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="rounded-[26px] bg-gradient-to-br from-lilac/40 via-soul/10 to-nebula/35 p-px shadow-[0_0_44px_-14px_rgba(138,92,246,0.55)]">
          <div className="rounded-[25px] bg-[#130b25]/85 px-5 py-4 backdrop-blur-xl">
            {waiting ? (
              <div className="space-y-3 py-1">
                <TypingIndicator />
                <div className="space-y-2" aria-hidden>
                  <div className="skeleton h-3 w-[86%]" />
                  <div className="skeleton h-3 w-[64%]" />
                </div>
              </div>
            ) : message.error ? (
              <div className="flex items-start gap-3 text-sm text-rose-200/90">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">SOUL couldn't finish that thought.</p>
                  <p className="mt-1 text-rose-200/60 break-words">{message.error}</p>
                  {isLast && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-rose-300/25 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-100 transition-colors hover:bg-rose-500/25"
                    >
                      <RefreshCw size={13} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Markdown content={message.content} streaming={streaming} />
                {message.stopped && (
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/30 font-display">Stopped</p>
                )}
              </>
            )}
          </div>
        </div>

        {!streaming && (
          <div className={cn("mt-1.5 flex items-center gap-0.5 pl-2", actionsVis)}>
            <ActionButton label={copied ? "Copied" : "Copy response"} onClick={doCopy}>
              <CopyIcon size={15} />
            </ActionButton>
            {isLast && (
              <ActionButton label="Regenerate response" onClick={onRegenerate}>
                <RefreshCw size={15} />
              </ActionButton>
            )}
            <ActionButton
              label="Good response"
              active={message.feedback === "up"}
              onClick={() => onFeedback(message.id, message.feedback === "up" ? null : "up")}
            >
              <ThumbsUp size={15} />
            </ActionButton>
            <ActionButton
              label="Bad response"
              active={message.feedback === "down"}
              onClick={() => onFeedback(message.id, message.feedback === "down" ? null : "down")}
            >
              <ThumbsDown size={15} />
            </ActionButton>
          </div>
        )}
      </div>
    </motion.div>
  );
}
