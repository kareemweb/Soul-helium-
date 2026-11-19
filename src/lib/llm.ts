import { demoReply } from "./demo";
import type { ModelOption, Settings } from "./types";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateParams {
  messages: LLMMessage[];
  model: ModelOption;
  settings: Settings;
  signal: AbortSignal;
  /** called with each new chunk of text as it arrives */
  onToken: (chunk: string) => void;
}

/* ------------------------------------------------------------------ *
 *  generateReply — THE single function that talks to an LLM.
 *
 *  • demo mode  → streams a canned markdown reply, word by word.
 *  • api mode   → POSTs to any OpenAI-compatible /chat/completions
 *                 endpoint (OpenAI, OpenRouter, Groq, Together, Ollama,
 *                 LM Studio, …) and parses the SSE stream.
 *
 *  To plug in a different provider, edit `streamFromApi` below — nothing
 *  else in the app needs to change. Resolve when finished, throw on error;
 *  an aborted signal throws an AbortError.
 * ------------------------------------------------------------------ */
export async function generateReply(params: GenerateParams): Promise<void> {
  if (params.settings.mode === "api") return streamFromApi(params);
  return streamDemo(params);
}

/* ------------------------------ demo ------------------------------ */

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function streamDemo({ messages, signal, onToken, model }: GenerateParams) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  // strip attachment blocks so keyword matching sees the human's words
  const prompt = lastUser.split("\n\n**Attached")[0];
  const reply = demoReply(prompt);

  await sleep(900 + Math.random() * 700, signal); // "thinking"

  const speed = model.id === "soul-spark" ? 0.55 : model.id === "soul-prime" ? 1.25 : 1;
  const tokens = reply.match(/\S+\s*|\s+/g) ?? [reply];
  for (const tok of tokens) {
    onToken(tok);
    const base = 22 + Math.random() * 38;
    const pause = /[.!?:]\s*$/.test(tok) ? 140 : tok.includes("\n") ? 60 : 0;
    await sleep(base * speed + pause * speed, signal);
  }
}

/* ------------------------------- api ------------------------------- */

async function streamFromApi({ messages, model, settings, signal, onToken }: GenerateParams) {
  if (!settings.endpoint.trim()) throw new Error("No API endpoint configured. Open Settings to add one.");

  const payload = [
    ...(settings.systemPrompt.trim() ? [{ role: "system" as const, content: settings.systemPrompt.trim() }] : []),
    ...messages,
  ];

  const res = await fetch(settings.endpoint.trim(), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.apiModelOverride.trim() || model.apiModel,
      messages: payload,
      stream: true,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message ?? JSON.stringify(j);
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Request failed (${res.status}). ${detail}`.trim());
  }

  const type = res.headers.get("content-type") ?? "";
  // Non-streaming JSON fallback
  if (!res.body || type.includes("application/json")) {
    const j = await res.json();
    const text: string = j?.choices?.[0]?.message?.content ?? "";
    for (const tok of text.match(/\S+\s*|\s+/g) ?? []) {
      onToken(tok);
      await sleep(18, signal);
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (delta) onToken(delta);
      } catch {
        /* ignore keep-alive / partial frames */
      }
    }
  }
}
