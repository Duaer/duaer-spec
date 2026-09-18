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
  assert.match(live, /--permission-mode bypassPermissions/);
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
  assert.match(
    i18n,
    /github\.com\/fujiezee\/duaer-spec\/blob\/main\/docs\/agent\/worker-models\.zh-CN\.md/,
  );
  assert.match(
    i18n,
    /github\.com\/fujiezee\/duaer-spec\/blob\/main\/docs\/agent\/worker-models\.md/,
  );
  assert.match(i18n, /data-i18n-html|\[data-i18n-html\]/);

  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /data-i18n-html="setup\.guideDoc"/);
  assert.doesNotMatch(html, /完整步骤见 docs\/agent\/worker-models/);

  const guide = fs.readFileSync(
    path.join(ROOT, "docs/agent/worker-models.md"),
    "utf8",
  );
  assert.match(guide, /Claude Code/);
  assert.match(guide, /api\.deepseek\.com\/anthropic/);
  assert.match(guide, /curl https:\/\/cursor\.com\/install/);
  assert.match(guide, /@anthropic-ai\/claude-code/);

  assert.match(live, /npm install -g @anthropic-ai\/claude-code/);
});
