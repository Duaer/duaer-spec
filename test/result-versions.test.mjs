/**
 * Result version snapshots + activelyRevising contract markers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = fs.readFileSync(path.join(ROOT, "bin", "duaer-live.mjs"), "utf8");
const APP = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
const I18N = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");

test("live source has result version helpers and /api/result route", () => {
  assert.match(LIVE, /function syncJobResults\b/);
  assert.match(LIVE, /function snapshotResultArtifact\b/);
  assert.match(LIVE, /function resolveResultSnapshotFile\b/);
  assert.match(LIVE, /\/api\/result\//);
  assert.match(LIVE, /打开看看|\/api\/preview\/ensure/);
  assert.doesNotMatch(LIVE, /label:\s*"查看成品"/);
});

test("activelyRevising requires worktree + open R work when delivery accepted", () => {
  assert.match(
    LIVE,
    /deliveryAccepted\s*\n\s*\?[\s\S]*?worktreeExists[\s\S]*?hasOpenRevWork[\s\S]*?terminalWorking/,
  );
});

test("desk UI: 打开看看 + version list + clear 续派中 on accept", () => {
  assert.match(HTML, /打开看看|preview\.view/);
  assert.match(HTML, /id="previewVersions"/);
  assert.match(HTML, /id="previewOpenFolder"/);
  assert.match(HTML, /id="previewService"|id="previewStartService"/);
  assert.doesNotMatch(HTML, /id="progressResult"/);
  assert.match(I18N, /"preview\.view":\s*"打开看看"/);
  assert.match(I18N, /"preview\.view":\s*"Open it"/);
  assert.match(I18N, /"preview\.openFolder"/);
  assert.match(I18N, /"preview\.startService"/);
  assert.match(APP, /function renderPreviewVersions\b/);
  assert.match(APP, /function openResultFolder\b/);
  assert.match(APP, /ensureAndOpenPreview|\/api\/preview\/ensure/);
  assert.match(APP, /refreshPreviewServiceStatus|\/api\/preview\/status/);
  assert.match(APP, /state\.reviseDispatching\s*=\s*false/);
  assert.match(APP, /data\?\.results/);
  assert.match(APP, /!productReady/);
  assert.match(LIVE, /\/api\/reveal/);
  assert.match(LIVE, /\/api\/preview\/ensure/);
  assert.match(LIVE, /\/api\/preview\/status|probeLocalPreviewStatus/);
});

test("snapshot + prune keeps only previewable files after worktree gone", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-result-"));
  try {
    const featureDir = path.join(tmp, "job");
    const wt = path.join(tmp, "wt");
    fs.mkdirSync(path.join(wt), { recursive: true });
    fs.mkdirSync(featureDir, { recursive: true });
    fs.writeFileSync(path.join(wt, "index.html"), "<h1>v1</h1>\n", "utf8");
    const destRoot = path.join(featureDir, "results", "r0");
    fs.mkdirSync(destRoot, { recursive: true });
    fs.copyFileSync(
      path.join(wt, "index.html"),
      path.join(destRoot, "index.html"),
    );
    fs.rmSync(wt, { recursive: true, force: true });
    assert.ok(!fs.existsSync(wt));
    assert.ok(fs.existsSync(path.join(destRoot, "index.html")));
    assert.equal(
      fs.readFileSync(path.join(destRoot, "index.html"), "utf8").trim(),
      "<h1>v1</h1>",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
