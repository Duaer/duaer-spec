/**
 * DeepSeek CLI catalog / launch contract (mirrors bin/duaer-live.mjs markers).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("live sources declare DeepSeek CLI worker", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /id:\s*"deepseek"/);
  assert.match(live, /function deepseekTerminalCommand/);
  assert.match(live, /npm install -g deepseek-tui/);
  assert.match(live, /return `\$\{bin\} -w \$\{ws\} --yolo --skip-onboarding/);
  assert.doesNotMatch(live, /return `\$\{bin\} --workspace /);
  assert.match(live, /--yolo --skip-onboarding/);
  assert.match(live, /deepseek-tui/);
  assert.match(live, /nvmBinDirs|npmGlobalBinDir/);

  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /DeepSeek/);

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.match(readme, /DeepSeek/);
});
