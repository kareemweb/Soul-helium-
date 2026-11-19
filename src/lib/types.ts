export type Role = "user" | "assistant";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  /** file text, when the file is text-based and small enough */
  text?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  createdAt: number;
  feedback?: "up" | "down" | null;
  error?: string | null;
  stopped?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  /** model id sent to the API when connected to a real LLM */
  apiModel: string;
}

export interface Settings {
  mode: "demo" | "api";
  endpoint: string;
  apiKey: string;
  /** optional override for the model id sent to the API */
  apiModelOverride: string;
  systemPrompt: string;
  displayName: string;
}

export type Status = "idle" | "thinking" | "streaming";
