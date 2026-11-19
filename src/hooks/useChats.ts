import { useCallback, useEffect, useRef, useState } from "react";
import type { Attachment, Chat, Message, Settings, Status } from "../lib/types";
import { MODELS } from "../lib/models";
import { generateReply, type LLMMessage } from "../lib/llm";
import { loadActive, loadChats, saveActive, saveChats } from "../lib/storage";

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function titleFrom(text: string, attachments: Attachment[]) {
  const t = (text || attachments[0]?.name || "New chat").replace(/\s+/g, " ").trim();
  return t.length > 44 ? t.slice(0, 44).trimEnd() + "…" : t;
}

/** Flatten a message (incl. attached text files) into what the LLM should see. */
function toLLM(m: Message): LLMMessage {
  if (m.role === "assistant" || !m.attachments?.length) return { role: m.role, content: m.content };
  const parts = m.attachments.map((a) =>
    a.text ? `\n\n**Attached: ${a.name}**\n\n\`\`\`\n${a.text}\n\`\`\`` : `\n\n**Attached: ${a.name}** (binary file, contents not available)`,
  );
  return { role: "user", content: (m.content || "Please take a look at the attached file.") + parts.join("") };
}

export function useChats(settings: Settings, modelId: string) {
  const [chats, setChats] = useState<Chat[]>(() => loadChats());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const id = loadActive();
    return id && loadChats().some((c) => c.id === id) ? id : null;
  });
  const [status, setStatus] = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);
  const modelRef = useRef(modelId);
  settingsRef.current = settings;
  modelRef.current = modelId;

  // persist (debounced so streaming doesn't hammer storage)
  useEffect(() => {
    const t = setTimeout(() => saveChats(chats), 350);
    return () => clearTimeout(t);
  }, [chats]);
  useEffect(() => saveActive(activeId), [activeId]);

  const active = chats.find((c) => c.id === activeId) ?? null;

  const patchChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);
  const patchMessage = useCallback(
    (chatId: string, msgId: string, fn: (m: Message) => Message) => {
      patchChat(chatId, (c) => ({ ...c, updatedAt: Date.now(), messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) }));
    },
    [patchChat],
  );

  const run = useCallback(
    async (chatId: string, assistantId: string, history: Message[]) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus("thinking");
      const model = MODELS.find((m) => m.id === modelRef.current) ?? MODELS[1];
      let got = false;
      try {
        await generateReply({
          messages: history.map(toLLM),
          model,
          settings: settingsRef.current,
          signal: ctrl.signal,
          onToken: (chunk) => {
            if (ctrl.signal.aborted) return;
            if (!got) {
              got = true;
              setStatus("streaming");
            }
            patchMessage(chatId, assistantId, (m) => ({ ...m, content: m.content + chunk }));
          },
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || ctrl.signal.aborted) {
          patchMessage(chatId, assistantId, (m) => (m.content ? { ...m, stopped: true } : { ...m, error: "Generation stopped before any text arrived." }));
        } else {
          const msg = err instanceof Error ? err.message : "Something went wrong.";
          patchMessage(chatId, assistantId, (m) => ({ ...m, error: msg }));
        }
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setStatus("idle");
      }
    },
    [patchMessage],
  );

  const send = useCallback(
    (text: string, attachments: Attachment[] = []) => {
      if (abortRef.current) return;
      const now = Date.now();
      const userMsg: Message = { id: uid(), role: "user", content: text, createdAt: now, attachments: attachments.length ? attachments : undefined };
      const aiMsg: Message = { id: uid(), role: "assistant", content: "", createdAt: now + 1 };

      let chatId = activeId;
      let history: Message[];
      if (!chatId || !chats.some((c) => c.id === chatId)) {
        chatId = uid();
        history = [userMsg];
        const chat: Chat = { id: chatId, title: titleFrom(text, attachments), messages: [userMsg, aiMsg], createdAt: now, updatedAt: now };
        setChats((cs) => [chat, ...cs]);
        setActiveId(chatId);
      } else {
        const existing = chats.find((c) => c.id === chatId)!;
        history = [...existing.messages, userMsg];
        patchChat(chatId, (c) => ({ ...c, updatedAt: now, messages: [...c.messages, userMsg, aiMsg] }));
      }
      void run(chatId, aiMsg.id, history);
    },
    [activeId, chats, patchChat, run],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (abortRef.current || !active) return;
    const msgs = active.messages;
    let idx = msgs.length - 1;
    while (idx >= 0 && msgs[idx].role !== "assistant") idx--;
    if (idx < 0) return;
    const history = msgs.slice(0, idx);
    const aiMsg: Message = { id: uid(), role: "assistant", content: "", createdAt: Date.now() };
    patchChat(active.id, (c) => ({ ...c, updatedAt: Date.now(), messages: [...history, aiMsg] }));
    void run(active.id, aiMsg.id, history);
  }, [active, patchChat, run]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
  }, []);

  const select = useCallback(
    (id: string) => {
      if (id === activeId) return;
      abortRef.current?.abort();
      setActiveId(id);
    },
    [activeId],
  );

  const rename = useCallback((id: string, title: string) => patchChat(id, (c) => ({ ...c, title })), [patchChat]);

  const remove = useCallback(
    (id: string) => {
      if (id === activeId) {
        abortRef.current?.abort();
        setActiveId(null);
      }
      setChats((cs) => cs.filter((c) => c.id !== id));
    },
    [activeId],
  );

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setChats([]);
  }, []);

  const feedback = useCallback(
    (msgId: string, value: "up" | "down" | null) => {
      if (!activeId) return;
      setChats((cs) =>
        cs.map((c) => (c.id === activeId ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, feedback: value } : m)) } : c)),
      );
    },
    [activeId],
  );

  return { chats, active, activeId, status, send, stop, regenerate, newChat, select, rename, remove, clearAll, feedback };
}
