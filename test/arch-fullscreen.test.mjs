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
  const page = fs.readFileSync(
    path.join(ROOT, "web/live-dev/dispatch-center.html"),
    "utf8",
  );
  const pageJs = fs.readFileSync(
    path.join(ROOT, "web/live-dev/dispatch-center.js"),
    "utf8",
  );
  assert.match(HTML, /id="architectureOpenFullscreen"/);
  assert.match(HTML, /architecture-mount-clickable/);
  assert.match(HTML, /id="dispatchCenterToggle"/);
  assert.match(HTML, /id="openTaskGraph"/);
  assert.doesNotMatch(HTML, /id="dispatchCenter"/);
  assert.match(page, /id="dispatchCenter"/);
  assert.match(page, /id="taskGraphMount"/);
  assert.match(page, /class="dispatch-center-page"/);
  assert.match(I18N, /"arch\.openFullscreen":\s*"全屏查看"/);
  assert.match(I18N, /已完成\/进行中\/等待中|done \/ in progress \/ waiting/i);
  assert.match(I18N, /"dispatch\.center":\s*"调度中心"/);
  assert.match(APP, /architectureOpenFullscreen/);
  assert.match(APP, /function openDispatchCenterPage/);
  assert.match(APP, /window\.open\(`\/dispatch-center\.html/);
  assert.match(APP, /openDispatchGraphPresent|refreshDispatchGraphWithProgress/);
  assert.match(APP, /openArchitecturePresent\(url,\s*\{\s*noZoom:\s*true\s*\}\)/);
  assert.match(APP, /lastJobProgress/);
  assert.match(APP, /opts\.noZoom|noz/);
  assert.doesNotMatch(APP, /setDispatchCenterOpen/);
  assert.match(pageJs, /mountArchitectureDiagram\(mount/);
  assert.match(pageJs, /openArchitecturePresent/);
  assert.match(pageJs, /noZoom:\s*true/);
  assert.match(pageJs, /searchParams\.set\("present",\s*"1"\)/);
  assert.match(pageJs, /searchParams\.set\("noz",\s*"1"\)/);
  assert.match(APP, /stopPropagation\(\)/);
  assert.match(APP, /addEventListener\(\s*"click",[\s\S]*?true\s*\)/);
  assert.match(CSS, /architecture-mount-clickable/);
  assert.match(CSS, /grid-template-columns:\s*100px/);
  assert.match(CSS, /dispatch-center-page/);
  assert.match(CSS, /dispatch-center-stage[\s\S]*?height:\s*100%/);
});
