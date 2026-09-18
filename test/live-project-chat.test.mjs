/**
 * Per-project chat persistence helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  projectChatKey,
  readProjectChat,
  writeProjectChat,
} from "../bin/live-project-chat.mjs";

test("projectChatKey is stable and path-based", () => {
  const a = projectChatKey("/Users/me/Projects/foo");
  const b = projectChatKey("/Users/me/Projects/foo/");
  assert.equal(a, b);
  assert.ok(a.length >= 16);
  assert.notEqual(a, projectChatKey("/Users/me/Projects/bar"));
});

test("write/read project chat round-trip", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  const saved = writeProjectChat(root, {
    projectPath,
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ],
    reviseMessages: [],
    rawAsk: "hello",
  });
  assert.equal(saved.messages.length, 2);
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.messages[0].content, "hello");
  assert.equal(loaded.messages[1].content, "hi");
  assert.equal(loaded.rawAsk, "hello");
  fs.rmSync(root, { recursive: true, force: true });
});

test("live sources wire project chat API + client persist", () => {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /\/api\/projects\/chat/);
  assert.match(live, /readProjectChat|writeProjectChat/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /persistProjectChat|loadProjectChatIntoUi/);
});
