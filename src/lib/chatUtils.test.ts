import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  createId,
  formatMessageForLLM,
  groupChatsByDate,
  isValidFirestoreId,
  sanitizeChatTitle,
  sanitizeDisplayName,
  sanitizeSystemPrompt,
  titleFromMessage,
  truncateErrorMessage,
  truncateMessageContent,
} from "./chatUtils";
import { DEFAULT_MODEL_ID, MODELS, SOUL_HELIUM } from "./models";

test("MODELS exposes only SOUL Helium", () => {
  assert.equal(MODELS.length, 1);
  assert.equal(MODELS[0].id, "soul-helium");
  assert.equal(MODELS[0].name, "SOUL Helium");
  assert.equal(MODELS[0].description, "SOUL · Helium");
  assert.equal(MODELS[0].apiModel, "helium");
  assert.equal(DEFAULT_MODEL_ID, SOUL_HELIUM.id);
});

test("createId generates valid Firestore IDs matching blueprint pattern", () => {
  for (let i = 0; i < 20; i++) {
    const id = createId();
    assert.equal(isValidFirestoreId(id), true);
  }
  assert.equal(isValidFirestoreId(""), false);
  assert.equal(isValidFirestoreId("bad/id"), false);
  assert.equal(isValidFirestoreId("a".repeat(129)), false);
});

test("sanitizers enforce blueprint field bounds", () => {
  assert.equal(sanitizeDisplayName("   "), "Guest");
  assert.equal(sanitizeDisplayName("  Alice   Smith  "), "Alice Smith");
  assert.equal(sanitizeDisplayName("x".repeat(90)).length, LIMITS.DISPLAY_NAME_MAX);

  assert.equal(sanitizeSystemPrompt("", "Default"), "Default");
  assert.equal(sanitizeSystemPrompt("a".repeat(3000), "Default").length, LIMITS.SYSTEM_PROMPT_MAX);

  assert.equal(sanitizeChatTitle("   "), "New chat");
  assert.equal(sanitizeChatTitle("t".repeat(200)).length, LIMITS.TITLE_MAX);

  assert.equal(truncateMessageContent("m".repeat(120_000)).length, LIMITS.CONTENT_MAX);
  assert.equal(truncateErrorMessage("e".repeat(1500)).length, LIMITS.ERROR_MAX);
});

test("titleFromMessage truncates long titles and falls back to attachment name", () => {
  assert.equal(titleFromMessage("Hello world"), "Hello world");
  assert.equal(titleFromMessage("", [{ id: "1", name: "notes.md", size: 120 }]), "notes.md");
  const long = "a".repeat(60);
  const title = titleFromMessage(long);
  assert.ok(title.endsWith("…"));
  assert.ok(title.length <= 45);
});

test("formatMessageForLLM appends text attachment content", () => {
  const formatted = formatMessageForLLM({
    id: "m1",
    role: "user",
    content: "Check this",
    createdAt: 1,
    attachments: [{ id: "a1", name: "hello.txt", size: 5, text: "hi" }],
  });
  assert.equal(formatted.role, "user");
  assert.ok(formatted.content.includes("**Attached: hello.txt**"));
  assert.ok(formatted.content.includes("hi"));
});

test("groupChatsByDate categorizes chats accurately", () => {
  const now = new Date(2026, 10, 19, 12, 0, 0).getTime();
  const day = 86_400_000;
  const groups = groupChatsByDate(
    [
      { id: "1", title: "Today chat", messages: [], createdAt: now, updatedAt: now - 1000 },
      { id: "2", title: "Yesterday chat", messages: [], createdAt: now, updatedAt: now - day },
      { id: "3", title: "Week chat", messages: [], createdAt: now, updatedAt: now - 3 * day },
      { id: "4", title: "Old chat", messages: [], createdAt: now, updatedAt: now - 20 * day },
    ],
    now,
  );
  assert.deepEqual(
    groups.map((g) => g.label),
    ["Today", "Yesterday", "Previous 7 days", "Earlier"],
  );
});
