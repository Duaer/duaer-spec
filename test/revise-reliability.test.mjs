/**
 * Revise-reliability contract checks (no Terminal / no paid LLM).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function snapshotTextFile(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, content: "" };
  return { exists: true, content: fs.readFileSync(filePath, "utf8") };
}

function restoreTextFile(filePath, snap) {
  if (!snap?.exists) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, snap.content, "utf8");
}

test("Brief file snapshot/restore rolls back revision writes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-snap-"));
  const spec = path.join(dir, "spec.md");
  fs.writeFileSync(spec, "# Spec\n\n**Status**: Accepted\n", "utf8");
  const snap = snapshotTextFile(spec);
  fs.writeFileSync(spec, "# Spec\n\n**Status**: Revising (r1)\n\n## Revision 1\n", "utf8");
  assert.match(fs.readFileSync(spec, "utf8"), /Revision 1/);
  restoreTextFile(spec, snap);
  assert.equal(fs.readFileSync(spec, "utf8"), snap.content);
  assert.doesNotMatch(fs.readFileSync(spec, "utf8"), /Revision 1/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("live sources declare reliability contracts", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /class LaunchGateError/);
  assert.match(live, /PREEMPT_FAILED/);
  assert.match(live, /terminalQueueSnapshot/);
  assert.match(live, /restoreTextFile/);
  assert.match(live, /preempted: killed\.length > 0/);

  // priorAccepted revise: clear leftovers before enqueue (no false PREEMPT_FAILED)
  const gate = live.indexOf("if (busy && preemptBusy)");
  assert.ok(gate >= 0, "preemptBusy gate missing");
  const slice = live.slice(gate, gate + 2800);
  const iPreempt = slice.indexOf("preemptBusyTerminalJob");
  const iEnqueue = slice.indexOf("enqueueTerminalJob");
  assert.ok(iPreempt >= 0, "preempt call missing in gate");
  assert.ok(iEnqueue > iPreempt, "enqueue must follow preempt");
  assert.match(slice, /enqueued:\s*false/);
  // Fresh Terminal open path defines queuedCount before return
  assert.match(
    live,
    /const jobPath = enqueueTerminalJob[\s\S]{0,120}const queuedCount = countQueuedJobs/,
  );

  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /180000/);
  assert.match(app, /reviseErrorMessage/);
  assert.match(app, /formatTerminalStatus/);
  assert.match(app, /err\.reviseTimeout/);

  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /err\.code\.PREEMPT_FAILED/);
  assert.match(i18n, /revise\.hintStuck/);
});
