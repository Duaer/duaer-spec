/**
 * Per-project desk session persistence (chat + requirements + job).
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

test("write/read project desk session round-trip (chat + card + job)", () => {
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
    card: {
      goal: "Ship login",
      outOfScope: "SSO",
      acceptance: "User can sign in",
      assumptions: "Email auth",
    },
    reviseCard: {
      goal: "Add MFA",
      outOfScope: "",
      acceptance: "TOTP works",
      assumptions: "",
    },
    jobId: "job-abc",
    locked: true,
    mode: "specify",
    reviseLocked: false,
    deployTarget: "github-pages",
    agentId: "cursor-agent",
    validate: {
      kind: "confirm",
      fingerprint: '{"goal":"Ship login","outOfScope":"SSO","acceptance":"User can sign in","assumptions":"Email auth"}',
      status: "passed",
      summary: "ok",
      issues: [],
    },
  });
  assert.equal(saved.messages.length, 2);
  assert.equal(saved.card.goal, "Ship login");
  assert.equal(saved.jobId, "job-abc");
  assert.equal(saved.locked, true);
  assert.equal(saved.validate.status, "passed");
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.messages[0].content, "hello");
  assert.equal(loaded.card.acceptance, "User can sign in");
  assert.equal(loaded.reviseCard.goal, "Add MFA");
  assert.equal(loaded.jobId, "job-abc");
  assert.equal(loaded.locked, true);
  assert.equal(loaded.deployTarget, "github-pages");
  assert.equal(loaded.agentId, "cursor-agent");
  assert.equal(loaded.validate.status, "passed");
  assert.equal(loaded.validate.summary, "ok");
  fs.rmSync(root, { recursive: true, force: true });
});

test("checking validate status is not restored (stored as idle)", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    validate: { kind: "confirm", fingerprint: "x", status: "checking", summary: "" },
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.validate.status, "idle");
  fs.rmSync(root, { recursive: true, force: true });
});

test("live sources wire project desk session API + client persist", () => {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /\/api\/projects\/chat/);
  assert.match(live, /readProjectChat|writeProjectChat/);
  assert.match(live, /body\.card/);
  assert.match(live, /body\.jobId/);
  assert.match(live, /body\.validate/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /persistProjectChat|loadProjectChatIntoUi/);
  assert.match(js, /schedulePersistProjectDesk/);
  assert.match(js, /applySavedCardFields/);
  assert.match(js, /restoreValidateGate/);
  assert.match(js, /startStatusPoll/);
});
