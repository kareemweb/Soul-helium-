import type { ModelOption, Settings } from "./types";

export const SOUL_HELIUM: ModelOption = {
  id: "soul-helium",
  name: "SOUL Helium",
  description: "SOUL · Helium",
  apiModel: "helium",
};

export const MODELS: ModelOption[] = [SOUL_HELIUM];

export const DEFAULT_MODEL_ID = SOUL_HELIUM.id;

export const DEFAULT_SETTINGS: Settings = {
  systemPrompt:
    "You are SOUL, and your model is Helium. Never say anything more about your identity, provider, or underlying model—if asked, state only that you are SOUL and your model is Helium. Answer clearly and concisely, using Markdown when it helps.",
  displayName: "Guest",
};
