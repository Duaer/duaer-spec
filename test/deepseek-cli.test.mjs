/**
 * Worker CLI catalog: Cursor Agent + Claude Code only (no third-party deepseek CLI).
 * DeepSeek remains a desk LLM *provider*, not a Terminal worker.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("live workers are Cursor Agent and Claude Code only", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /id:\s*"cursor-agent"/);
  assert.match(live, /id:\s*"claude"/);
  assert.doesNotMatch(live, /function deepseekTerminalCommand/);
  assert.doesNotMatch(live, /deepseek-tui/);
  // Desk LLM provider preset remains
  assert.match(live, /baseUrl:\s*"https:\/\/api\.deepseek\.com"/);

  const tooling = fs.readFileSync(
    path.join(ROOT, "bin/live-tooling.mjs"),
    "utf8",
  );
  assert.doesNotMatch(tooling, /DEEPSEEK_INSTALL_CMD/);
  assert.doesNotMatch(tooling, /deepseek-tui/);

  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /Cursor Agent \/ Claude Code/);
  assert.doesNotMatch(i18n, /deepseek-tui/);

  const guide = fs.readFileSync(
    path.join(ROOT, "docs/agent/worker-models.md"),
    "utf8",
  );
  assert.match(guide, /Claude Code/);
  assert.match(guide, /api\.deepseek\.com\/anthropic/);
});
