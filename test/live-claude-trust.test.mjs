/**
 * Claude workspace trust stamp for FED launches.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  claudeJsonPath,
  claudeTrustCandidatePaths,
  markClaudeWorkspacesTrusted,
  normalizeClaudeProjectKey,
} from "../bin/live-claude-trust.mjs";

test("claudeJsonPath respects CLAUDE_CONFIG_DIR", () => {
  const p = claudeJsonPath({
    env: { CLAUDE_CONFIG_DIR: "/tmp/claude-cfg" },
    homedir: () => "/home/me",
  });
  assert.equal(p, path.join("/tmp/claude-cfg", ".claude.json"));
  const def = claudeJsonPath({
    env: {},
    homedir: () => "/home/me",
  });
  assert.equal(def, path.join("/home/me", ".claude.json"));
});

test("normalizeClaudeProjectKey strips trailing slash", () => {
  const k = normalizeClaudeProjectKey("/Users/me/app/");
  assert.equal(k, "/Users/me/app");
});

test("claudeTrustCandidatePaths includes .worktree parent", () => {
  const wt = "/Users/me/Products/demo/.worktree/feat-login";
  const keys = claudeTrustCandidatePaths(wt);
  assert.ok(keys.includes("/Users/me/Products/demo/.worktree/feat-login"));
  assert.ok(keys.includes("/Users/me/Products/demo"));
});

test("markClaudeWorkspacesTrusted sets hasTrustDialogAccepted and preserves config", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-claude-trust-"));
  const configPath = path.join(root, ".claude.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        theme: "dark",
        projects: {
          "/other": { hasCompletedProjectOnboarding: true },
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  const wt = path.join(root, "product", ".worktree", "feat-x");
  fs.mkdirSync(wt, { recursive: true });
  const result = markClaudeWorkspacesTrusted(wt, {
    env: { CLAUDE_CONFIG_DIR: root },
    homedir: () => root,
  });
  assert.equal(result.ok, true);
  assert.equal(result.path, configPath);
  const doc = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(doc.theme, "dark");
  assert.equal(doc.projects["/other"].hasCompletedProjectOnboarding, true);
  const wtKey = normalizeClaudeProjectKey(wt);
  const productKey = normalizeClaudeProjectKey(path.join(root, "product"));
  assert.equal(doc.projects[wtKey].hasTrustDialogAccepted, true);
  assert.equal(doc.projects[productKey].hasTrustDialogAccepted, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test("live Claude launch stamps trust before spawn", () => {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /markClaudeWorkspacesTrusted/);
  assert.match(live, /live-claude-trust/);
  assert.match(live, /--permission-mode bypassPermissions/);
});
