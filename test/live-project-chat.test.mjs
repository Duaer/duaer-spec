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

test("dispatchPhase done round-trips in project chat", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    jobId: "job-dispatched",
    locked: true,
    dispatchPhase: "done",
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.dispatchPhase, "done");
  writeProjectChat(root, {
    projectPath,
    jobId: "job-new",
    dispatchPhase: "working",
  });
  assert.equal(readProjectChat(root, projectPath).dispatchPhase, null);
  fs.rmSync(root, { recursive: true, force: true });
});

test("architecture mode and messages round-trip", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    locked: true,
    mode: "architecture",
    architecture: {
      status: "designing",
      ir: null,
      url: null,
      summary: "",
      confirmed: false,
    },
    architectureMessages: [
      { role: "user", content: "（系统）kick" },
      { role: "assistant", content: "先问前端还是后端？" },
    ],
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.mode, "architecture");
  assert.equal(loaded.architecture.status, "designing");
  assert.equal(loaded.architectureMessages.length, 2);
  assert.equal(loaded.architectureMessages[1].content, "先问前端还是后端？");
  fs.rmSync(root, { recursive: true, force: true });
});

test("architecturePrevious round-trips in project chat", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    locked: true,
    architecture: {
      status: "preview",
      ir: { diagram_type: "architecture", components: [{ id: "a" }] },
      url: "/api/architecture/new.html",
      summary: "new",
      confirmed: false,
    },
    architecturePrevious: {
      ir: { diagram_type: "architecture", components: [{ id: "old" }] },
      url: "/api/architecture/old.html",
      summary: "old",
    },
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.architecturePrevious.url, "/api/architecture/old.html");
  assert.equal(loaded.architecturePrevious.summary, "old");
  assert.equal(loaded.architecture.url, "/api/architecture/new.html");
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
  assert.match(js, /clearDeskWorkspace|stopStatusPoll/);
  assert.match(js, /schedulePersistProjectDesk/);
  assert.match(js, /applySavedCardFields/);
  assert.match(js, /restoreValidateGate/);
  assert.match(js, /startStatusPoll/);
  assert.match(js, /polledJobId/);
  assert.match(js, /state\.jobId !== polledJobId/);
  assert.match(js, /dispatchPhase|markDispatchDone|applyDispatchStateFromStatus/);
  assert.match(js, /appendReviseMessagesToLog|restoreReviseDeskUi/);
  assert.match(js, /reviseCards|reviseDraft|upsertReviseCardEntry/);
  assert.match(js, /revisePlanConfirmed|confirmRevisePlan|dispatchReviseAgent/);
  assert.match(js, /renderReviseVersionAccordion|initialArchitecture/);
  assert.match(js, /modules|activeModuleId|renderModuleTabs|workerCount/);
});

test("reviseCards architecture snapshot round-trips", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-arch-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    messages: [],
    reviseCards: [
      {
        revision: 1,
        goal: "lighter",
        outOfScope: "",
        acceptance: "ok",
        assumptions: "",
        architecture: {
          url: "/arch/r1.html",
          summary: "edge",
          changed: true,
          fingerprint: "abc",
          ir: { schema_version: 1 },
        },
      },
    ],
    initialArchitecture: {
      url: "/arch/v0.html",
      summary: "base",
      changed: true,
      fingerprint: "zzz",
    },
    reviseExpanded: { "0": true, "1": false },
    locked: true,
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.reviseCards[0].architecture.url, "/arch/r1.html");
  assert.equal(loaded.reviseCards[0].architecture.changed, true);
  assert.equal(loaded.initialArchitecture.url, "/arch/v0.html");
  assert.equal(loaded.reviseExpanded["1"], false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reviseCards round-trip and legacy lastRevision migrate", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    messages: [],
    reviseMessages: [],
    card: { goal: "A", outOfScope: "", acceptance: "B", assumptions: "" },
    reviseCard: {
      goal: "lighter",
      outOfScope: "",
      acceptance: "ok",
      assumptions: "dark",
    },
    reviseCards: [
      {
        revision: 1,
        goal: "lighter",
        outOfScope: "copy",
        acceptance: "ok",
        assumptions: "dark",
      },
    ],
    reviseDraft: {
      revision: 2,
      goal: "bigger title",
      outOfScope: "",
      acceptance: "title 24px",
      assumptions: "",
    },
    reviseCardFocus: 2,
    lastRevision: {
      revision: 1,
      change: "lighter",
      keep: "copy",
      acceptance: "ok",
      reason: "dark",
    },
    locked: true,
    reviseLocked: false,
    mode: "revise",
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.reviseCards.length, 1);
  assert.equal(loaded.reviseCards[0].revision, 1);
  assert.equal(loaded.reviseCards[0].goal, "lighter");
  assert.equal(loaded.reviseDraft.revision, 2);
  assert.equal(loaded.reviseDraft.goal, "bigger title");
  assert.equal(loaded.reviseCardFocus, 2);

  const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-chat-leg-"));
  const legacyPath = path.join(legacyRoot, "app");
  writeProjectChat(legacyRoot, {
    projectPath: legacyPath,
    messages: [],
    reviseCard: {
      goal: "legacy change",
      outOfScope: "keep",
      acceptance: "done",
      assumptions: "why",
    },
    lastRevision: {
      revision: 3,
      change: "legacy change",
      keep: "keep",
      acceptance: "done",
      reason: "why",
    },
    locked: true,
    reviseLocked: true,
  });
  const migrated = readProjectChat(legacyRoot, legacyPath);
  assert.equal(migrated.reviseCards.length, 1);
  assert.equal(migrated.reviseCards[0].revision, 3);
  assert.equal(migrated.reviseCards[0].goal, "legacy change");
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(legacyRoot, { recursive: true, force: true });
});
