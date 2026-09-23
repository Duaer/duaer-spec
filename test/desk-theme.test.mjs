/**
 * Desk theme helpers (unit).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("theme.mjs and desk wire light/dark toggle", () => {
  const theme = fs.readFileSync(path.join(ROOT, "web/live-dev/theme.mjs"), "utf8");
  assert.match(theme, /duaer\.live\.theme/);
  assert.match(theme, /export function toggleTheme/);
  assert.match(theme, /export function initTheme/);
  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(css, /\[data-theme="light"\]/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /--brand-size|--input-bg|--on-accent|--composer-bg/);
  assert.doesNotMatch(css, /#e05a2b|rgba\(224,\s*90,\s*43|#13202b|#0b1118|#1a100c/);
  assert.doesNotMatch(css, /color:\s*#9fe8dc/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /duaer\.live\.theme/);
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /from "\.\/theme\.mjs"/);
  assert.match(app, /toggleTheme/);
  const dc = fs.readFileSync(path.join(ROOT, "web/live-dev/dispatch-center.js"), "utf8");
  assert.match(dc, /from "\.\/theme\.mjs"/);
});
