/**
 * Live starts without requiring a model; opens desk URL.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("duaer-live opens desk URL without model gate on serve", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function openDeskInBrowser/);
  assert.match(live, /openDeskInBrowser\(deskUrl\)/);
  assert.match(live, /模型尚未配置/);
  assert.doesNotMatch(
    live,
    /模型未配置。请先：\s*\n\s*duaer live config --provider deepseek/,
  );
});

test("desk UI shows shell when model missing and allows closing Settings", () => {
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /function showSetup/);
  assert.match(js, /el\.desk\.hidden\s*=\s*false/);
  assert.match(js, /setup\.hintOpenSettings/);
  assert.doesNotMatch(
    js,
    /First-time config:\s*keep drawer open until saved/,
  );
  assert.match(js, /settingsClose\.hidden\s*=\s*false/);
});
