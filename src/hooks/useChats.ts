import { useCallback, useEffect, useRef, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import type { Attachment, Chat, Message, Settings, Status } from "../lib/types";
import { SOUL_HELIUM } from "../lib/models";
import { generateReply } from "../lib/llm";
import { loadActive, loadChats, saveActive, saveChats } from "../lib/storage";
import { OperationType, db, handleFirestoreError } from "../lib/firebase";
import {
  LIMITS,
  createId,
  formatMessageForLLM,
  sanitizeChatTitle,
  titleFromMessage,
  truncateErrorMessage,
  truncateMessageContent,
} from "../lib/chatUtils";

function toMillis(ts: unknown, fallback = Date.now()): number {
  if (typeof ts === "number") return ts;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof (ts as { toMillis?: () => number }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return fallback;
}

export function useChats(settings: Settings, user: User | null, authReady: boolean) {
  const [guestChats, setGuestChats] = useState<Chat[]>(() => loadChats());
  const [cloudChats, setCloudChats] = useState<Chat[]>([]);
  const [cloudMessages, setCloudMessages] = useState<Record<string, Message[]>>({});
  const [streamingDrafts, setStreamingDrafts] = useState<Record<string, Partial<Message>>>({});
  const [activeId, setActiveId] = useState<string | null>(() => {
    const id = loadActive();
    return id && loadChats().some((c) => c.id === id) ? id : null;
  });
  const [status, setStatus] = useState<Status>("idle");
  const [syncLoading, setSyncLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userRef = useRef(user);
  userRef.current = user;

  // Persist guest chats to localStorage
  useEffect(() => {
    if (user) return;
    const t = setTimeout(() => saveChats(guestChats), 350);
    return () => clearTimeout(t);
  }, [guestChats, user]);

  useEffect(() => {
    saveActive(activeId);
  }, [activeId]);

  // Subscribe to Firestore chats when signed in
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setCloudChats([]);
      setCloudMessages({});
      setSyncLoading(false);
      return;
    }

    setSyncLoading(true);
    setActiveId(null);
    const chatsPath = `users/${user.uid}/chats`;
    const q = query(collection(db, "users", user.uid, "chats"), where("userId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Chat[] = snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          return {
            id: d.id,
            title: typeof data.title === "string" ? data.title : "New chat",
            messages: [],
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
          };
        });
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        setCloudChats(list);
        setSyncLoading(false);
      },
      (error) => {
        setSyncLoading(false);
        handleFirestoreError(error, OperationType.LIST, chatsPath);
      },
    );

    return () => unsub();
  }, [user, authReady]);

  // Subscribe to messages of active chat when signed in
  useEffect(() => {
    if (!user || !activeId) return;
    const messagesPath = `users/${user.uid}/chats/${activeId}/messages`;
    const q = query(collection(db, "users", user.uid, "chats", activeId, "messages"), where("userId", "==", user.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: Message[] = snap.docs
          .map((d) => {
            const data = d.data({ serverTimestamps: "estimate" });
            const attachNames = Array.isArray(data.attachmentNames) ? (data.attachmentNames as string[]) : [];
            const msg: Message & { _order: number } = {
              id: d.id,
              role: data.role === "assistant" ? "assistant" : "user",
              content: typeof data.content === "string" ? data.content : "",
              createdAt: toMillis(data.createdAt),
              feedback: data.feedback === "up" || data.feedback === "down" ? data.feedback : null,
              error: typeof data.error === "string" ? data.error : null,
              stopped: data.stopped === true,
              attachments: attachNames.length
                ? attachNames.map((name, idx) => ({ id: `${d.id}-att-${idx}`, name, size: 0 }))
                : undefined,
              _order: typeof data.order === "number" ? data.order : toMillis(data.createdAt),
            };
            return msg;
          })
          .sort((a, b) => a._order - b._order)
          .map(({ _order: _, ...rest }) => rest);

        setCloudMessages((prev) => ({ ...prev, [activeId]: msgs }));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, messagesPath);
      },
    );

    return () => unsub();
  }, [user, activeId]);

  const chats: Chat[] = user
    ? cloudChats.map((c) => ({
        ...c,
        messages: (cloudMessages[c.id] ?? []).map((m) =>
          streamingDrafts[m.id] ? { ...m, ...streamingDrafts[m.id] } : m,
        ),
      }))
    : guestChats;

  const active = chats.find((c) => c.id === activeId) ?? null;

  const patchGuestChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setGuestChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const patchGuestMessage = useCallback(
    (chatId: string, msgId: string, fn: (m: Message) => Message) => {
      patchGuestChat(chatId, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)),
      }));
    },
    [patchGuestChat],
  );

  const run = useCallback(
    async (chatId: string, assistantId: string, history: Message[]) => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus("thinking");
      const currentUser = userRef.current;
      let got = false;
      let accumulated = "";
      let finalError: string | null = null;
      let wasStopped = false;

      try {
        await generateReply({
          messages: history.map(formatMessageForLLM),
          model: SOUL_HELIUM,
          settings: settingsRef.current,
          signal: ctrl.signal,
          onToken: (chunk) => {
            if (ctrl.signal.aborted) return;
            if (!got) {
              got = true;
              setStatus("streaming");
            }
            accumulated += chunk;
            if (currentUser) {
              setStreamingDrafts((prev) => ({
                ...prev,
                [assistantId]: { content: accumulated },
              }));
            } else {
              patchGuestMessage(chatId, assistantId, (m) => ({
                ...m,
                content: m.content + chunk,
              }));
            }
          },
        });
        if (!accumulated.trim() && !ctrl.signal.aborted) {
          finalError = "SOUL Helium returned an empty response. Please try again.";
          if (!currentUser) {
            patchGuestMessage(chatId, assistantId, (m) => ({ ...m, error: finalError }));
          }
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || ctrl.signal.aborted) {
          wasStopped = true;
          if (!accumulated) {
            finalError = "Generation stopped before any text arrived.";
          }
          if (!currentUser) {
            patchGuestMessage(chatId, assistantId, (m) =>
              m.content
                ? { ...m, stopped: true }
                : { ...m, error: "Generation stopped before any text arrived." },
            );
          }
        } else {
          const msg = err instanceof Error ? err.message : "Something went wrong.";
          finalError = msg;
          if (!currentUser) {
            patchGuestMessage(chatId, assistantId, (m) => ({ ...m, error: msg }));
          }
        }
      } finally {
        if (currentUser) {
          const msgPath = `users/${currentUser.uid}/chats/${chatId}/messages/${assistantId}`;
          const chatPath = `users/${currentUser.uid}/chats/${chatId}`;
          try {
            const batch = writeBatch(db);
            const msgRef = doc(db, "users", currentUser.uid, "chats", chatId, "messages", assistantId);
            const chatRef = doc(db, "users", currentUser.uid, "chats", chatId);
            const payload: Record<string, unknown> = {
              content: truncateMessageContent(accumulated),
              updatedAt: serverTimestamp(),
            };
            if (wasStopped && accumulated) {
              payload.stopped = true;
            }
            if (finalError) {
              payload.error = truncateErrorMessage(finalError);
            }
            batch.update(msgRef, payload);
            batch.update(chatRef, { updatedAt: serverTimestamp() });
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, msgPath || chatPath);
          } finally {
            setStreamingDrafts((prev) => {
              const next = { ...prev };
              delete next[assistantId];
              return next;
            });
          }
        }

        if (abortRef.current === ctrl) abortRef.current = null;
        setStatus("idle");
      }
    },
    [patchGuestMessage],
  );

  const send = useCallback(
    async (text: string, attachments: Attachment[] = []) => {
      if (abortRef.current) return;
      const currentUser = userRef.current;
      if (!currentUser) return;

      const now = Date.now();
      const userMsg: Message = {
        id: createId(),
        role: "user",
        content: text,
        createdAt: now,
        attachments: attachments.length ? attachments : undefined,
      };
      const aiMsg: Message = {
        id: createId(),
        role: "assistant",
        content: "",
        createdAt: now + 1,
      };

      const isNewChat = !activeId || !cloudChats.some((c) => c.id === activeId);
      const chatId = isNewChat ? createId() : activeId!;
      const existingMsgs = isNewChat ? [] : (cloudMessages[chatId] ?? []);
      const history = [...existingMsgs, userMsg];

      if (isNewChat) {
        setActiveId(chatId);
      }

      // Optimistically show messages while Firestore batch commits
      setCloudMessages((prev) => ({
        ...prev,
        [chatId]: [...existingMsgs, userMsg, aiMsg],
      }));

      const batch = writeBatch(db);
      const chatRef = doc(db, "users", currentUser.uid, "chats", chatId);
      if (isNewChat) {
        batch.set(chatRef, {
          id: chatId,
          userId: currentUser.uid,
          title: sanitizeChatTitle(titleFromMessage(text, attachments)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(chatRef, { updatedAt: serverTimestamp() });
      }

      const attachNames = attachments
        .slice(0, LIMITS.ATTACHMENTS_MAX)
        .map((a) => a.name.slice(0, LIMITS.ATTACHMENT_NAME_MAX));

      const userMsgRef = doc(db, "users", currentUser.uid, "chats", chatId, "messages", userMsg.id);
      batch.set(userMsgRef, {
        id: userMsg.id,
        userId: currentUser.uid,
        chatId,
        role: "user",
        content: truncateMessageContent(text),
        ...(attachNames.length ? { attachmentNames: attachNames } : {}),
        order: now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const aiMsgRef = doc(db, "users", currentUser.uid, "chats", chatId, "messages", aiMsg.id);
      batch.set(aiMsgRef, {
        id: aiMsg.id,
        userId: currentUser.uid,
        chatId,
        role: "assistant",
        content: "",
        order: now + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const path = `users/${currentUser.uid}/chats/${chatId}`;
      try {
        await batch.commit();
      } catch (err) {
        let message = "Failed to save message to cloud history.";
        try {
          handleFirestoreError(err, OperationType.WRITE, path);
        } catch (wrapped) {
          message = wrapped instanceof Error ? wrapped.message : message;
        }
        setCloudMessages((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((m) => (m.id === aiMsg.id ? { ...m, error: message } : m)),
        }));
        return;
      }

      void run(chatId, aiMsg.id, history);
    },
    [activeId, guestChats, cloudChats, cloudMessages, patchGuestChat, run],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const regenerate = useCallback(async () => {
    if (abortRef.current || !active) return;
    const currentUser = userRef.current;
    if (!currentUser) return;

    const msgs = active.messages;
    let idx = msgs.length - 1;
    while (idx >= 0 && msgs[idx].role !== "assistant") idx--;
    if (idx < 0) return;

    const history = msgs.slice(0, idx);
    const removed = msgs.slice(idx);
    const now = Date.now();
    const aiMsg: Message = { id: createId(), role: "assistant", content: "", createdAt: now };

    const batch = writeBatch(db);
    for (const oldMsg of removed) {
      batch.delete(doc(db, "users", currentUser.uid, "chats", active.id, "messages", oldMsg.id));
    }
    const aiMsgRef = doc(db, "users", currentUser.uid, "chats", active.id, "messages", aiMsg.id);
    batch.set(aiMsgRef, {
      id: aiMsg.id,
      userId: currentUser.uid,
      chatId: active.id,
      role: "assistant",
      content: "",
      order: now,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, "users", currentUser.uid, "chats", active.id), { updatedAt: serverTimestamp() });

    const path = `users/${currentUser.uid}/chats/${active.id}/messages`;
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }

    void run(active.id, aiMsg.id, history);
  }, [active, patchGuestChat, run]);

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

  const rename = useCallback(
    async (id: string, title: string) => {
      const clean = sanitizeChatTitle(title);
      const currentUser = userRef.current;
      if (!currentUser) {
        patchGuestChat(id, (c) => ({ ...c, title: clean }));
        return;
      }
      const path = `users/${currentUser.uid}/chats/${id}`;
      try {
        await updateDoc(doc(db, "users", currentUser.uid, "chats", id), {
          title: clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [patchGuestChat],
  );

  const remove = useCallback(
    async (id: string) => {
      if (id === activeId) {
        abortRef.current?.abort();
        setActiveId(null);
      }
      const currentUser = userRef.current;
      if (!currentUser) {
        setGuestChats((cs) => cs.filter((c) => c.id !== id));
        return;
      }
      const path = `users/${currentUser.uid}/chats/${id}`;
      try {
        const msgSnap = await getDocs(
          query(collection(db, "users", currentUser.uid, "chats", id, "messages"), where("userId", "==", currentUser.uid)),
        );
        const batch = writeBatch(db);
        msgSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, "users", currentUser.uid, "chats", id));
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [activeId],
  );

  const clearAll = useCallback(async () => {
    abortRef.current?.abort();
    setActiveId(null);
    const currentUser = userRef.current;
    if (!currentUser) {
      setGuestChats([]);
      return;
    }
    const path = `users/${currentUser.uid}/chats`;
    try {
      const chatsSnap = await getDocs(query(collection(db, "users", currentUser.uid, "chats"), where("userId", "==", currentUser.uid)));
      for (const chatDoc of chatsSnap.docs) {
        const msgSnap = await getDocs(
          query(collection(db, "users", currentUser.uid, "chats", chatDoc.id, "messages"), where("userId", "==", currentUser.uid)),
        );
        const batch = writeBatch(db);
        msgSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(chatDoc.ref);
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }, []);

  const feedback = useCallback(
    async (msgId: string, value: "up" | "down" | null) => {
      if (!activeId) return;
      const currentUser = userRef.current;
      if (!currentUser) {
        setGuestChats((cs) =>
          cs.map((c) =>
            c.id === activeId
              ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, feedback: value } : m)) }
              : c,
          ),
        );
        return;
      }
      const path = `users/${currentUser.uid}/chats/${activeId}/messages/${msgId}`;
      try {
        await updateDoc(doc(db, "users", currentUser.uid, "chats", activeId, "messages", msgId), {
          feedback: value ?? "none",
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [activeId],
  );

  return {
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
  };
}
