/**
 * Progress-on-accept contract (mirrors helpers in bin/duaer-live.mjs).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseTasksProgress(tasksMd) {
  const tasks = [];
  const lines = String(tasksMd || "").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const text = m[2].trim();
    const idMatch = text.match(/^(T\d+|R\d+[-\w]*)\b/i);
    tasks.push({
      id: idMatch ? idMatch[1].toUpperCase() : `S${tasks.length + 1}`,
      text,
      done,
    });
  }
  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done) || null;
  let current = "暂无任务清单";
  if (total === 0) current = "暂无任务清单";
  else if (!next) current = "任务已全部勾选 · 等待 delivery accepted";
  else current = `进行中：${next.text}`;
  return { total, done: doneCount, current, tasks };
}

function progressForAcceptedDelivery(progress, { worktreeExists = true } = {}) {
  const base =
    progress && typeof progress === "object"
      ? progress
      : { total: 0, done: 0, current: "", tasks: [] };
  const tasks = Array.isArray(base.tasks)
    ? base.tasks.map((t) => ({ ...t, done: true }))
    : [];
  const total = Number(base.total) || tasks.length;
  return {
    ...base,
    total,
    done: total,
    tasks,
    current: worktreeExists
      ? "delivery accepted · 工单完成"
      : "delivery accepted · 已合入 develop（worktree 已清理）",
  };
}

function reconcileTasksMdOnAccept(tasksPath) {
  if (!tasksPath || !fs.existsSync(tasksPath)) return false;
  const raw = fs.readFileSync(tasksPath, "utf8");
  if (!/^\s*[-*]\s+\[\s\]\s+/m.test(raw)) return false;
  const next = raw.replace(/^(\s*[-*]\s+)\[\s\](\s+)/gm, "$1[x]$2");
  if (next === raw) return false;
  fs.writeFileSync(tasksPath, next, "utf8");
  return true;
}

test("accepted delivery never keeps done < total", () => {
  const raw = parseTasksProgress(`# Tasks
- [ ] T001 Implement
- [ ] T002 Verify
- [ ] T003 Stamp delivery
`);
  assert.equal(raw.done, 0);
  assert.equal(raw.total, 3);
  const synced = progressForAcceptedDelivery(raw, { worktreeExists: true });
  assert.equal(synced.done, 3);
  assert.equal(synced.total, 3);
  assert.ok(synced.tasks.every((t) => t.done));
  assert.match(synced.current, /delivery accepted/);
  assert.doesNotMatch(`${synced.done}/${synced.total}`, /^0\//);
});

test("reconcileTasksMdOnAccept checks remaining boxes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-tasks-"));
  const p = path.join(dir, "tasks.md");
  fs.writeFileSync(
    p,
    `# Tasks\n\n- [ ] T001 A\n- [x] T002 B\n- [ ] T003 C\n`,
    "utf8",
  );
  assert.equal(reconcileTasksMdOnAccept(p), true);
  const after = fs.readFileSync(p, "utf8");
  assert.match(after, /- \[x\] T001/);
  assert.match(after, /- \[x\] T002/);
  assert.match(after, /- \[x\] T003/);
  assert.equal(reconcileTasksMdOnAccept(p), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("live sources include progress-on-accept helpers", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function progressForAcceptedDelivery/);
  assert.match(live, /function reconcileTasksMdOnAccept/);
  assert.match(live, /progress = progressForAcceptedDelivery/);
});
