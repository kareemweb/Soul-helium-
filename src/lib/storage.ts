import type { Chat, Settings } from "./types";
import { DEFAULT_MODEL_ID, DEFAULT_SETTINGS } from "./models";
import { sanitizeSettings } from "./chatUtils";

const CHATS_KEY = "soul.chats.v1";
const ACTIVE_KEY = "soul.active.v1";
const SETTINGS_KEY = "soul.settings.v1";
const MODEL_KEY = "soul.model.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export const loadChats = (): Chat[] => {
  const chats = read<Chat[]>(CHATS_KEY, []);
  return chats.map((c) => ({
    ...c,
    messages: c.messages.filter((m) => m.role === "user" || m.content || m.error),
  }));
};
export const saveChats = (chats: Chat[]) => write(CHATS_KEY, chats);

export const loadActive = (): string | null => read<string | null>(ACTIVE_KEY, null);
export const saveActive = (id: string | null) => write(ACTIVE_KEY, id);

export const loadSettings = (): Settings =>
  sanitizeSettings(read<Partial<Settings>>(SETTINGS_KEY, {}), DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write(SETTINGS_KEY, sanitizeSettings(s, DEFAULT_SETTINGS));

export const loadModel = (): string => DEFAULT_MODEL_ID;
export const saveModel = (_id: string) => write(MODEL_KEY, DEFAULT_MODEL_ID);
