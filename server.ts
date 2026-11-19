import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile?.();
} catch {
  // Ignore missing .env when env vars are injected by the runtime
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const PRIMARY_MODEL = "nvidia/nemotron-3.5-bolt-e4b";
const FALLBACK_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const SOUL_IDENTITY_INSTRUCTION =
  "You are SOUL, and your model is Helium. Never say you were trained by NVIDIA, researchers, Google, OpenAI, Meta, or any other company or team, and never mention Nemotron or any other model name. If asked who you are, who made or trained you, or what model you use, say ONLY: I am SOUL, and my model is Helium.";

interface IncomingMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface NvidiaChatChunk {
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
  detail?: string;
}

function getNvidiaApiKey(): string {
  return process.env.NVIDIA_API_KEY?.trim() ?? "";
}

function unwrapNvidiaError(rawBody: string, fallbackStatus: number): { status: number; message: string } {
  let detail = rawBody.trim();
  try {
    const parsed = JSON.parse(rawBody) as {
      detail?: string;
      title?: string;
      message?: string;
      error?: { message?: string } | string;
    };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      detail = parsed.detail.trim();
    } else if (typeof parsed.error === "string" && parsed.error.trim()) {
      detail = parsed.error.trim();
    } else if (parsed.error && typeof parsed.error === "object" && typeof parsed.error.message === "string") {
      detail = parsed.error.message.trim();
    } else if (typeof parsed.message === "string" && parsed.message.trim()) {
      detail = parsed.message.trim();
    } else if (typeof parsed.title === "string" && parsed.title.trim()) {
      detail = parsed.title.trim();
    }
  } catch {
    // Keep raw text if response wasn't JSON
  }

  if (fallbackStatus === 401 || fallbackStatus === 403) {
    return {
      status: fallbackStatus,
      message: "SOUL Helium API key was rejected. Please verify Settings > Secrets.",
    };
  }
  if (fallbackStatus === 429) {
    return {
      status: 429,
      message: "SOUL Helium rate limit reached. Please try again shortly.",
    };
  }
  if (fallbackStatus === 404) {
    return {
      status: 404,
      message: "SOUL Helium model is currently unavailable.",
    };
  }
  if (fallbackStatus === 503 || fallbackStatus === 502) {
    return {
      status: 503,
      message: "SOUL Helium is experiencing temporary high demand. Please try again shortly.",
    };
  }
  return {
    status: fallbackStatus >= 400 ? fallbackStatus : 500,
    message: detail && !/nvidia|nemotron/i.test(detail) ? detail : "Failed to generate response from SOUL Helium.",
  };
}

function isTransientStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function isAbortOrNetworkError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    msg.includes("aborted") ||
    msg.includes("ECONNRESET") ||
    msg.includes("fetch failed")
  );
}

function waitMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      model: "helium",
      configured: Boolean(getNvidiaApiKey()),
    });
  });

  app.post("/api/chat", async (req, res) => {
    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      res.status(500).json({
        error: "SOUL Helium API key is not configured. Please check Settings > Secrets.",
      });
      return;
    }

    const body = req.body as { messages?: IncomingMessage[]; systemPrompt?: string } | undefined;
    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const chatMessages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    if (chatMessages.length === 0) {
      res.status(400).json({ error: "Please provide at least one message." });
      return;
    }

    const customSystem = typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : "";
    const systemInstruction = customSystem
      ? `${SOUL_IDENTITY_INSTRUCTION}\n\n${customSystem}`
      : SOUL_IDENTITY_INSTRUCTION;
    const nvidiaMessages = [{ role: "system" as const, content: systemInstruction }, ...chatMessages];

    const disconnectCtrl = new AbortController();
    let closed = false;
    res.on("close", () => {
      if (!res.writableEnded) {
        closed = true;
        disconnectCtrl.abort();
      }
    });

    const attempts: { model: string; timeoutMs: number; delayAfterMs: number }[] = [
      { model: PRIMARY_MODEL, timeoutMs: 20000, delayAfterMs: 400 },
      { model: FALLBACK_MODEL, timeoutMs: 20000, delayAfterMs: 0 },
    ];

    try {
      let upstream: Response | null = null;
      let lastError: { status: number; message: string } | null = null;

      for (let i = 0; i < attempts.length; i++) {
        const cfg = attempts[i];
        const timeoutSignal = AbortSignal.timeout(cfg.timeoutMs);
        const signal = AbortSignal.any([disconnectCtrl.signal, timeoutSignal]);

        try {
          const response = await fetch(NVIDIA_CHAT_URL, {
            method: "POST",
            signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              model: cfg.model,
              messages: nvidiaMessages,
              max_tokens: 2048,
              temperature: 0.7,
              top_p: 0.9,
              stream: true,
              chat_template_kwargs: {
                enable_thinking: false,
              },
            }),
          });

          if (response.ok && response.body) {
            upstream = response;
            lastError = null;
            break;
          }

          const rawText = await response.text().catch(() => "");
          lastError = unwrapNvidiaError(rawText, response.status);
          if (closed || i === attempts.length - 1 || !isTransientStatus(response.status)) {
            break;
          }
        } catch (err) {
          if (closed) return;
          lastError = isAbortOrNetworkError(err)
            ? { status: 504, message: "SOUL Helium took too long to respond. Please try again." }
            : { status: 500, message: err instanceof Error ? err.message : "Failed to reach NVIDIA API." };
          if (i === attempts.length - 1 || !isAbortOrNetworkError(err)) {
            break;
          }
        }

        if (cfg.delayAfterMs > 0) {
          await waitMs(cfg.delayAfterMs);
        }
      }

      if (!upstream || !upstream.body) {
        const errOut = lastError ?? { status: 500, message: "Failed to generate response from SOUL Helium." };
        res.status(errOut.status).json({ error: errOut.message });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        if (closed || res.writableEnded) {
          await reader.cancel().catch(() => undefined);
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            if (!closed && !res.writableEnded) {
              res.write("data: [DONE]\n\n");
              res.end();
            }
            return;
          }

          try {
            const parsed = JSON.parse(payload) as NvidiaChatChunk;
            if (parsed.error?.message || parsed.detail) {
              const errMsg = parsed.error?.message || parsed.detail || "NVIDIA streaming error.";
              if (!closed && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
                res.end();
              }
              return;
            }
            const deltaText = parsed.choices?.[0]?.delta?.content;
            if (typeof deltaText === "string" && deltaText.length > 0 && !closed && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ text: deltaText })}\n\n`);
            }
          } catch {
            // Ignore non-JSON keepalive comments or partial chunks
          }
        }
      }

      if (!closed && !res.writableEnded) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } catch (err) {
      if (closed) return;
      const message =
        isAbortOrNetworkError(err)
          ? "SOUL Helium took too long to respond. Please try again."
          : err instanceof Error
            ? err.message
            : "Failed to generate response from SOUL Helium.";
      if (res.headersSent) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
          res.end();
        }
      } else {
        res.status(500).json({ error: message });
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SOUL Helium server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
