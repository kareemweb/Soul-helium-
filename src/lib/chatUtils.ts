import type { Attachment, Chat, Message, Settings } from "./types";

export const LIMITS = {
  ID_MAX: 128,
  DISPLAY_NAME_MAX: 60,
  SYSTEM_PROMPT_MAX: 2000,
  TITLE_MAX: 120,
  CONTENT_MAX: 100_000,
  ERROR_MAX: 1000,
  ATTACHMENTS_MAX: 5,
  ATTACHMENT_NAME_MAX: 256,
} as const;

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidFirestoreId(id: string): boolean {
  return id.length >= 1 && id.length <= LIMITS.ID_MAX && ID_PATTERN.test(id);
}

export function createId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "Guest";
  return trimmed.slice(0, LIMITS.DISPLAY_NAME_MAX);
}

export function sanitizeSystemPrompt(prompt: string | null | undefined, fallback: string): string {
  const val = (prompt ?? "").trim();
  if (!val) return fallback.slice(0, LIMITS.SYSTEM_PROMPT_MAX);
  return val.slice(0, LIMITS.SYSTEM_PROMPT_MAX);
}

export function sanitizeSettings(settings: Partial<Settings>, fallback: Settings): Settings {
  return {
    displayName: sanitizeDisplayName(settings.displayName ?? fallback.displayName),
    systemPrompt: sanitizeSystemPrompt(settings.systemPrompt ?? fallback.systemPrompt, fallback.systemPrompt),
  };
}

export function titleFromMessage(text: string, attachments: Attachment[] = []): string {
  const raw = (text || attachments[0]?.name || "New chat").replace(/\s+/g, " ").trim();
  const base = raw || "New chat";
  if (base.length <= 44) return base;
  return base.slice(0, 44).trimEnd() + "…";
}

export function sanitizeChatTitle(title: string): string {
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!trimmed) return "New chat";
  return trimmed.slice(0, LIMITS.TITLE_MAX);
}

export function truncateMessageContent(content: string): string {
  return content.slice(0, LIMITS.CONTENT_MAX);
}

export function truncateErrorMessage(error: string): string {
  return error.slice(0, LIMITS.ERROR_MAX);
}

export function formatMessageForLLM(m: Message): { role: "user" | "assistant"; content: string } {
  if (m.role === "assistant" || !m.attachments?.length) {
    return { role: m.role, content: m.content };
  }
  const parts = m.attachments.map((a) =>
    a.text
      ? `\n\n**Attached: ${a.name}**\n\n\`\`\`\n${a.text}\n\`\`\``
      : `\n\n**Attached: ${a.name}** (binary file, contents not available)`,
  );
  return {
    role: "user",
    content: (m.content || "Please take a look at the attached file.") + parts.join(""),
  };
}

export function groupChatsByDate(chats: Chat[], nowMs = Date.now()): { label: string; items: Chat[] }[] {
  const now = new Date(nowMs);
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
  return groups.filter((g) => g.items.length > 0);
}
