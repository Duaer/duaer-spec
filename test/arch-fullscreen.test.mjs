/**
 * Architecture / task-graph present (fullscreen) open helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
const I18N = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");

test("architecturePresentUrl sets present=1 without embed", () => {
  assert.match(APP, /function architecturePresentUrl\b/);
  assert.match(APP, /searchParams\.set\("present",\s*"1"\)/);
  assert.match(APP, /searchParams\.delete\("embed"\)/);
  assert.match(APP, /function openArchitecturePresent\b/);
  assert.match(APP, /function bindArchitecturePresentClick\b/);
});

test("desk wires click + fullscreen button for architecture", () => {
  assert.match(HTML, /id="architectureOpenFullscreen"/);
  assert.match(HTML, /architecture-mount-clickable/);
  assert.match(HTML, /与系统架构图同一排版；色条表示数字员工分工/);
  assert.match(I18N, /"arch\.openFullscreen":\s*"全屏查看"/);
  assert.match(I18N, /点击图可新页面全屏查看/);
  assert.match(APP, /architectureOpenFullscreen/);
  assert.match(APP, /bindArchitecturePresentClick\(\s*el\.taskGraphMount/);
  assert.match(CSS, /architecture-mount-clickable/);
});
