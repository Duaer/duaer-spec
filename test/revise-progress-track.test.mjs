/**
 * Revise-round progress scope (mirrors helpers in bin/duaer-live.mjs).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function inferRevisionFromTasksMd(tasksMd) {
  let max = 0;
  for (const line of String(tasksMd || "").split(/\r?\n/)) {
    const header = line.match(/^##\s+Revision\s+(\d+)\b/i);
    if (header) max = Math.max(max, Number(header[1]) || 0);
    const item = line.match(/^\s*[-*]\s+\[[ xX]\]\s+R(\d+)(?:[-.\s]|$)/i);
    if (item) max = Math.max(max, Number(item[1]) || 0);
  }
  return max;
}

function tasksMdScope(tasksMd, revision = 0) {
  const raw = String(tasksMd || "");
  const rev = Number(revision) || 0;
  if (rev > 0) {
    const section = raw.match(
      new RegExp(
        `##\\s+Revision\\s+${rev}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+Revision\\s+\\d+|$)`,
        "i",
      ),
    );
    if (section) return section[1];
    return raw
      .split(/\r?\n/)
      .filter((line) =>
        new RegExp(`^\\s*[-*]\\s+\\[[ xX]\\]\\s+R${rev}(?:[-.\\s]|$)`, "i").test(
          line,
        ),
      )
      .join("\n");
  }
  const cut = raw.search(/\n##\s+Revision\s+\d+\b/i);
  return cut >= 0 ? raw.slice(0, cut) : raw;
}

function parseTasksProgress(tasksMd, { revision = 0 } = {}) {
  const tasks = [];
  const scope = tasksMdScope(tasksMd, revision);
  const lines = String(scope || "").split(/\r?\n/);
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
  if (total === 0) {
    current =
      Number(revision) > 0
        ? `Revision ${revision} · 等待任务清单`
        : "暂无任务清单";
  } else if (!next) {
    current =
      Number(revision) > 0
        ? `Revision ${revision} · 任务已全部勾选 · 等待 delivery accepted`
        : "任务已全部勾选 · 等待 delivery accepted";
  } else {
    current = `进行中：${next.text}`;
  }
  return {
    total,
    done: doneCount,
    current,
    tasks,
    revision: Number(revision) || 0,
  };
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

/** Mirror dispatchStatus revise inference for contract tests. */
function inferActiveProgress(tasksMd, {
  jobStatus = "dispatched",
  revisionCount = 0,
  deliveryStatus = "open",
  deliveryRevision = 0,
  terminalBusy = false,
  queueDepth = 0,
} = {}) {
  const inferredFromTasks = inferRevisionFromTasksMd(tasksMd);
  const revisionHint = Math.max(
    Number(revisionCount || 0),
    Number(deliveryRevision || 0),
    inferredFromTasks,
  );
  const revProgressHint =
    revisionHint > 0
      ? parseTasksProgress(tasksMd, { revision: revisionHint })
      : null;
  const hasOpenRevWork =
    Boolean(revProgressHint) &&
    revProgressHint.total > 0 &&
    revProgressHint.done < revProgressHint.total;
  const deliveryAccepted = deliveryStatus === "accepted";
  const deliveryOpen = deliveryStatus === "open";
  const activelyRevising =
    (!deliveryAccepted && jobStatus === "revising") ||
    (revisionHint > 0 && deliveryOpen) ||
    (hasOpenRevWork && (terminalBusy || Number(queueDepth || 0) > 0));
  const activeRevision =
    revisionHint > 0 &&
    (activelyRevising ||
      Number(revisionCount || 0) > 0 ||
      Number(deliveryRevision || 0) > 0 ||
      inferredFromTasks > 0)
      ? revisionHint
      : 0;
  let progress = parseTasksProgress(tasksMd, {
    revision: activeRevision > 0 ? activeRevision : 0,
  });
  const accepted = deliveryAccepted && !activelyRevising;
  if (accepted) {
    progress = progressForAcceptedDelivery(progress, { worktreeExists: true });
  } else if (activelyRevising && progress.total === 0 && activeRevision > 0) {
    progress = {
      ...progress,
      current: `Revision ${activeRevision} · 已续派，等待任务勾选…`,
    };
  }
  return {
    activelyRevising,
    activeRevision,
    status: activelyRevising ? "revising" : accepted ? "accepted" : jobStatus,
    progress,
  };
}

const SAMPLE = `# Tasks

- [x] T001 Implement
- [x] T002 Verify
- [x] T003 Stamp delivery

## Revision 1 tasks

- [ ] R1-1 Apply revision: widen sidebar
- [x] R1-2 Verify against revision acceptance
- [ ] R1-3 Stamp delivery.json accepted
`;

test("inferRevisionFromTasksMd reads Revision header and R ids", () => {
  assert.equal(inferRevisionFromTasksMd(SAMPLE), 1);
  assert.equal(inferRevisionFromTasksMd("# Tasks\n- [ ] T001 A\n"), 0);
});

test("dispatch scope excludes Revision sections", () => {
  const p = parseTasksProgress(SAMPLE, { revision: 0 });
  assert.equal(p.total, 3);
  assert.equal(p.done, 3);
  assert.ok(p.tasks.every((t) => t.id.startsWith("T")));
});

test("revision scope shows only R{n} checklist", () => {
  const p = parseTasksProgress(SAMPLE, { revision: 1 });
  assert.equal(p.total, 3);
  assert.equal(p.done, 1);
  assert.equal(p.tasks[0].id, "R1-1");
  assert.match(p.current, /R1-1/);
  assert.doesNotMatch(p.current, /delivery accepted/);
});

test("after Confirm revise, lagging accepted + busy Terminal tracks R tasks", () => {
  const out = inferActiveProgress(SAMPLE, {
    jobStatus: "accepted",
    revisionCount: 0,
    deliveryStatus: "accepted",
    deliveryRevision: 0,
    terminalBusy: true,
  });
  assert.equal(out.activelyRevising, true);
  assert.equal(out.activeRevision, 1);
  assert.equal(out.status, "revising");
  assert.equal(out.progress.total, 3);
  assert.equal(out.progress.done, 1);
  assert.doesNotMatch(out.progress.current, /delivery accepted/);
});

test("first dispatch open delivery is not revising", () => {
  const md = `# Tasks\n\n- [ ] T001 A\n- [ ] T002 B\n`;
  const out = inferActiveProgress(md, {
    jobStatus: "dispatched",
    revisionCount: 0,
    deliveryStatus: "open",
    terminalBusy: true,
  });
  assert.equal(out.activelyRevising, false);
  assert.equal(out.activeRevision, 0);
  assert.equal(out.progress.total, 2);
  assert.equal(out.progress.done, 0);
});

test("revise with open delivery scopes to Revision N", () => {
  const out = inferActiveProgress(SAMPLE, {
    jobStatus: "revising",
    revisionCount: 1,
    deliveryStatus: "open",
    deliveryRevision: 1,
  });
  assert.equal(out.activelyRevising, true);
  assert.equal(out.activeRevision, 1);
  assert.equal(out.progress.done, 1);
  assert.equal(out.progress.total, 3);
});

test("revise accept normalizes only after revise idle", () => {
  const done = SAMPLE.replace(
    "- [ ] R1-1",
    "- [x] R1-1",
  ).replace("- [ ] R1-3", "- [x] R1-3");
  const out = inferActiveProgress(done, {
    jobStatus: "revising",
    revisionCount: 1,
    deliveryStatus: "accepted",
    deliveryRevision: 1,
    terminalBusy: false,
  });
  assert.equal(out.activelyRevising, false);
  assert.equal(out.status, "accepted");
  assert.equal(out.progress.done, out.progress.total);
  assert.match(out.progress.current, /delivery accepted/);
});

test("live sources include revise progress-scope helpers", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function inferRevisionFromTasksMd/);
  assert.match(live, /function tasksMdScope/);
  assert.match(live, /activelyRevising/);
  assert.match(live, /hasOpenRevWork/);
  assert.match(live, /revisionHint > 0 && deliveryOpen/);
});
