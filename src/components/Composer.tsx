import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, FileText, Mic, Paperclip, Square, X } from "lucide-react";
import type { Attachment } from "../lib/types";
import { cn } from "../utils/cn";

export interface ComposerHandle {
  focus: () => void;
}

interface Props {
  generating: boolean;
  onSend: (text: string, attachments: Attachment[]) => boolean | void;
  onStop: () => void;
  handleRef?: Ref<ComposerHandle>;
}

interface Burst {
  id: number;
  parts: { dx: number; dy: number; size: number; hue: string; delay: number }[];
}
interface Ripple {
  id: number;
  x: number;
  y: number;
}

const TEXT_EXT = /\.(txt|md|markdown|json|csv|tsv|js|jsx|ts|tsx|py|html|css|xml|yml|yaml|sh|sql|rs|go|java|c|cpp|h|rb|php|log|toml|ini)$/i;
const MAX_TEXT = 60_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRec: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function Composer({ generating, onSend, onStop, handleRef }: Props) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [listening, setListening] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const baseRef = useRef("");
  const uid = useRef(0);

  useImperativeHandle(handleRef, () => ({ focus: () => taRef.current?.focus() }), []);

  // auto-grow
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => () => recRef.current?.stop(), []);

  const canSend = (value.trim().length > 0 || files.length > 0) && !generating;

  const fireEffects = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++uid.current;
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((v) => v.id !== id)), 700);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = 14;
    const parts = Array.from({ length: n }, (_, i) => {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 34 + Math.random() * 34;
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - 10,
        size: 3 + Math.random() * 4,
        hue: ["#B89BFF", "#8A5CF6", "#6B8BFF", "#ffffff"][i % 4],
        delay: Math.random() * 60,
      };
    });
    setBursts((b) => [...b, { id, parts }]);
    setTimeout(() => setBursts((b) => b.filter((v) => v.id !== id)), 900);
  };

  const submit = useCallback(() => {
    if (!canSend) return;
    const accepted = onSend(value.trim(), files);
    if (accepted === false) return;
    setValue("");
    setFiles([]);
    recRef.current?.stop();
  }, [canSend, onSend, value, files]);

  const onActionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (generating) return onStop();
    if (!canSend) return;
    fireEffects(e);
    submit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!canSend) return;
      const btn = document.getElementById("soul-send");
      if (btn) {
        fireEffects({ currentTarget: btn, clientX: 0, clientY: 0 } as unknown as React.MouseEvent<HTMLButtonElement>);
      }
      submit();
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 5);
    e.target.value = "";
    const out: Attachment[] = [];
    for (const f of list) {
      const isText = f.type.startsWith("text/") || TEXT_EXT.test(f.name);
      let text: string | undefined;
      if (isText && f.size <= MAX_TEXT * 2) {
        try {
          text = (await f.text()).slice(0, MAX_TEXT);
        } catch {
          /* unreadable */
        }
      }
      out.push({ id: `${Date.now()}-${f.name}-${Math.random()}`, name: f.name, size: f.size, text });
    }
    setFiles((p) => [...p, ...out].slice(0, 5));
    taRef.current?.focus();
  };

  const toggleMic = () => {
    if (!SpeechRec) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SpeechRec();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    baseRef.current = value ? value.replace(/\s*$/, " ") : "";
    rec.onresult = (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      let t = "";
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      setValue(baseRef.current + t);
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-3 pb-3 sm:px-4 sm:pb-5">
      <div
        className={cn(
          "glass-strong rounded-[28px] transition-[box-shadow,border-color] duration-300 ease-out",
          "shadow-[0_0_0_0_rgba(138,92,246,0),0_20px_50px_-20px_rgba(0,0,0,0.8)]",
          "focus-within:border-lilac/60 focus-within:shadow-[0_0_0_1px_rgba(184,155,255,0.35),0_0_38px_2px_rgba(138,92,246,0.4),0_20px_60px_-20px_rgba(107,139,255,0.5)]",
        )}
      >
        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <ul className="flex flex-wrap gap-2 px-4 pt-3">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex max-w-full items-center gap-2 rounded-xl border border-soul/25 bg-soul/10 py-1.5 pl-2.5 pr-1.5 text-xs text-white/80"
                  >
                    <FileText size={14} className="shrink-0 text-lilac" />
                    <span className="truncate max-w-[160px]">{f.name}</span>
                    <span className="text-white/40">{formatSize(f.size)}</span>
                    <button
                      aria-label={`Remove ${f.name}`}
                      onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                      className="grid h-5 w-5 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1.5 p-2.5">
          <input ref={fileRef} type="file" multiple hidden onChange={onPick} aria-hidden tabIndex={-1} />
          <button
            type="button"
            aria-label="Attach files"
            title="Attach files"
            onClick={() => fileRef.current?.click()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/55 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-soul/20 hover:text-white hover:shadow-[0_8px_20px_-8px_rgba(138,92,246,0.8)]"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={listening ? "Listening…" : "Message SOUL…"}
            aria-label="Message SOUL"
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-[10px] text-[15.5px] leading-[24px] text-white placeholder:text-white/35 focus:outline-none"
          />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!SpeechRec}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={listening}
              title={SpeechRec ? "Voice input" : "Voice input isn't supported in this browser"}
              className={cn(
                "relative grid h-11 w-11 place-items-center rounded-full text-white/55 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-soul/20 hover:text-white disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:bg-transparent",
                listening && "bg-soul/25 text-white",
              )}
            >
              {listening && <span className="absolute inset-1 rounded-full border border-lilac/70 animate-listen" />}
              <Mic size={20} />
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              id="soul-send"
              type="button"
              onClick={onActionClick}
              disabled={!generating && !canSend}
              aria-label={generating ? "Stop generating" : "Send message"}
              className={cn(
                "relative grid h-11 w-11 place-items-center overflow-hidden rounded-full text-white transition-all duration-300 ease-out",
                "bg-gradient-to-br from-soul via-[#7a72f8] to-nebula",
                "shadow-[0_0_22px_2px_rgba(138,92,246,0.55)] hover:-translate-y-0.5 hover:shadow-[0_0_34px_6px_rgba(138,92,246,0.75)] active:scale-95",
                "disabled:cursor-not-allowed disabled:from-soul/25 disabled:via-soul/20 disabled:to-nebula/25 disabled:text-white/40 disabled:shadow-none disabled:hover:translate-y-0",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={generating ? "stop" : "send"}
                  initial={{ scale: 0.4, opacity: 0, rotate: -40 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.4, opacity: 0, rotate: 40 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="grid place-items-center"
                >
                  {generating ? <Square size={15} fill="currentColor" /> : <ArrowUp size={21} strokeWidth={2.4} />}
                </motion.span>
              </AnimatePresence>
              {ripples.map((r) => (
                <span
                  key={r.id}
                  className="pointer-events-none absolute rounded-full bg-white/60 animate-ripple"
                  style={{ left: r.x - 44, top: r.y - 44, width: 88, height: 88 }}
                />
              ))}
            </button>
            {/* particle burst */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
              {bursts.map((b) =>
                b.parts.map((p, i) => (
                  <span
                    key={`${b.id}-${i}`}
                    className="absolute rounded-full animate-particle"
                    style={
                      {
                        width: p.size,
                        height: p.size,
                        left: -p.size / 2,
                        top: -p.size / 2,
                        background: p.hue,
                        boxShadow: `0 0 8px ${p.hue}`,
                        animationDelay: `${p.delay}ms`,
                        "--dx": `${p.dx}px`,
                        "--dy": `${p.dy}px`,
                      } as React.CSSProperties
                    }
                  />
                )),
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 hidden text-center text-[11px] tracking-wide text-white/30 sm:block">
        <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line ·{" "}
        <kbd className="font-sans">/</kbd> to focus · SOUL can make mistakes
      </p>
    </div>
  );
}
