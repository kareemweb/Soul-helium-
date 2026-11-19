import type { ModelOption, Settings } from "./types";

export const MODELS: ModelOption[] = [
  { id: "soul-prime", name: "SOUL Prime", description: "Deepest reasoning, richest answers", apiModel: "gpt-4o" },
  { id: "soul-flow", name: "SOUL Flow", description: "Balanced speed and depth", apiModel: "gpt-4o-mini" },
  { id: "soul-spark", name: "SOUL Spark", description: "Lightning-fast, light touch", apiModel: "gpt-4o-mini" },
];

export const DEFAULT_SETTINGS: Settings = {
  mode: "demo",
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  apiModelOverride: "",
  systemPrompt:
    "You are SOUL, a calm, warm and brilliant AI companion. Answer clearly and concisely, using Markdown when it helps.",
  displayName: "Guest",
};
