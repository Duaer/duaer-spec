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
  assert.match(page, /class="top"/);
  assert.match(page, /id="langSelect"/);
  assert.match(page, /id="historyToggle"/);
  assert.match(page, /id="cfgOpen"/);
  assert.match(page, /top-lead-link/);
  assert.match(pageJs, /function wireTopNav|goDesk\("projects"\)/);
  assert.match(APP, /function applyOpenPanelFromQuery/);
  assert.match(APP, /open === "projects"/);
  assert.match(I18N, /"arch\.openFullscreen":\s*"全屏查看"/);
  assert.match(I18N, /已完成\/进行中\/等待中|done \/ in progress \/ waiting/i);
  assert.match(I18N, /"dispatch\.center":\s*"调度中心"/);
  assert.match(APP, /architectureOpenFullscreen/);
  assert.match(APP, /function openDispatchCenterPage/);
  assert.match(APP, /function openExternalDeskUrl/);
  assert.match(APP, /function toDeskExternalHref/);
  assert.match(APP, /DESK_ORIGIN\s*=\s*"http:\/\/127\.0\.0\.1:8787"/);
  assert.match(APP, /\/api\/open-external/);
  assert.match(APP, /openExternalDeskUrl\(/);
  assert.match(APP, /openDispatchGraphPresent|refreshDispatchGraphWithProgress/);
  assert.match(APP, /openDispatchCenterPage\(state\.projectPath\)/);
  assert.match(APP, /function openArchitecturePresent\b/);
  assert.match(APP, /lastJobProgress/);
  assert.match(APP, /opts\.noZoom|noz/);
  assert.doesNotMatch(APP, /setDispatchCenterOpen/);
  assert.match(pageJs, /mountArchitectureDiagram\(mount/);
  assert.match(pageJs, /stage:\s*true/);
  assert.match(pageJs, /architecture-mount\.mjs\?v=node-zoom-1/);
  assert.doesNotMatch(pageJs, /openArchitecturePresent|openExternalDeskUrl|\/api\/open-external/);
  assert.doesNotMatch(page, /architecture-mount-clickable/);
  assert.match(APP, /new URL\(raw,\s*DESK_ORIGIN\)/);
  assert.doesNotMatch(pageJs, /new URL\(raw,\s*DESK_ORIGIN\)/);
  assert.doesNotMatch(
    APP.slice(APP.indexOf("function architecturePresentUrl"), APP.indexOf("function openArchitecturePresent")),
    /window\.location\.origin/,
  );
  assert.match(APP, /stopPropagation\(\)/);
  assert.match(APP, /addEventListener\(\s*"click",[\s\S]*?true\s*\)/);
  assert.match(CSS, /architecture-mount-clickable/);
  assert.match(CSS, /grid-template-columns:\s*100px/);
  assert.match(CSS, /dispatch-center-page/);
  assert.match(CSS, /dispatch-center-stage[\s\S]*?height:\s*100%/);
  assert.match(CSS, /body\.dispatch-center-page > \.top/);
  assert.doesNotMatch(CSS, /\.dispatch-center-top\s*\{/);
});
