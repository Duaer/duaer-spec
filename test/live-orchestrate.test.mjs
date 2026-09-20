import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  blockedTasks,
  doneIdsFromProgress,
  fingerprintWave,
  finishedWaveBlocksQueue,
  isReady,
  pendingWaveReleases,
  readyTasks,
  runningWaveIdsFromScript,
  undoneReleasedFingerprints,
  waveForWorker,
  workerOrchestrationState,
} from "../bin/live-orchestrate.mjs";

const pool = {
  tasks: [
    { id: "T001", workerId: "w1", title: "a", dependsOn: [] },
    { id: "T002", workerId: "w1", title: "b", dependsOn: ["T001"] },
    { id: "T003", workerId: "w2", title: "c", dependsOn: ["T001"] },
    { id: "T004", workerId: "w2", title: "d", dependsOn: ["T003"] },
  ],
};

test("isReady and readyTasks respect dependsOn", () => {
  const empty = new Set();
  assert.equal(isReady(pool.tasks[0], empty), true);
  assert.equal(isReady(pool.tasks[1], empty), false);
  const ready0 = readyTasks(pool, empty);
  assert.deepEqual(
    ready0.map((t) => t.id),
    ["T001"],
  );
  const after = new Set(["T001"]);
  assert.equal(isReady(pool.tasks[1], after), true);
  assert.equal(isReady(pool.tasks[2], after), true);
  assert.equal(isReady(pool.tasks[3], after), false);
  const blocked = blockedTasks(pool, after);
  assert.deepEqual(
    blocked.map((t) => t.id),
    ["T004"],
  );
});

test("waveForWorker returns only ready owned tasks", () => {
  const w1 = waveForWorker(pool, "w1", new Set());
  assert.deepEqual(
    w1.map((t) => t.id),
    ["T001"],
  );
  const w2 = waveForWorker(pool, "w2", new Set());
  assert.deepEqual(w2.map((t) => t.id), []);
  const after = waveForWorker(pool, "w2", new Set(["T001"]));
  assert.deepEqual(
    after.map((t) => t.id),
    ["T003"],
  );
});

test("fingerprintWave is stable sorted", () => {
  assert.equal(fingerprintWave(["T002", "T001"]), "T001,T002");
  assert.equal(fingerprintWave([{ id: "t002" }, { id: "t001" }]), "T001,T002");
});

test("doneIdsFromProgress", () => {
  const done = doneIdsFromProgress({
    tasks: [
      { id: "T001", done: true },
      { id: "T002", done: false },
    ],
  });
  assert.ok(done.has("T001"));
  assert.equal(done.has("T002"), false);
});

test("pendingWaveReleases enqueues even when lane busy", () => {
  const pending = pendingWaveReleases({
    pool,
    workerCount: 2,
    doneSet: new Set(["T001"]),
    releasedWaves: { w1: ["T001"] },
    terminals: {
      w1: { busy: false, queueDepth: 0 },
      w2: { busy: true, queueDepth: 0 },
    },
  });
  const byId = Object.fromEntries(pending.map((p) => [p.workerId, p]));
  assert.equal(byId.w1.reason, "ready");
  assert.deepEqual(
    byId.w1.wave.map((t) => t.id),
    ["T002"],
  );
  assert.equal(byId.w2.reason, "ready");
  assert.deepEqual(
    byId.w2.wave.map((t) => t.id),
    ["T003"],
  );
});

test("workerOrchestrationState waiting_deps", () => {
  assert.equal(
    workerOrchestrationState({
      ownedTotal: 2,
      ownedDone: 0,
      readyCount: 0,
      blockedOwned: 2,
      terminal: { busy: false, queueDepth: 0 },
    }),
    "waiting_deps",
  );
  assert.equal(
    workerOrchestrationState({
      ownedTotal: 2,
      ownedDone: 2,
      readyCount: 0,
      blockedOwned: 0,
    }),
    "done",
  );
});

test("runningWaveIdsFromScript reads the launched wave, not the owned list", () => {
  const script = `你负责的全部任务：T001, T002, T003。
当前编排波次（只做这些）：
- T002: Satisfy acceptance
`;
  assert.deepEqual(runningWaveIdsFromScript(script), ["T002"]);
});

test("finishedWaveBlocksQueue preempts only a checked running wave with a waiter", () => {
  const done = new Set(["T001"]);
  assert.equal(
    finishedWaveBlocksQueue({
      busy: true,
      queueDepth: 1,
      runningWaveIds: ["T001"],
      doneSet: done,
    }),
    true,
  );
  assert.equal(
    finishedWaveBlocksQueue({
      busy: true,
      queueDepth: 1,
      runningWaveIds: ["T002"],
      doneSet: done,
    }),
    false,
  );
  assert.equal(
    finishedWaveBlocksQueue({
      busy: true,
      queueDepth: 1,
      runningWaveIds: [],
      doneSet: done,
    }),
    true,
  );
  assert.equal(
    finishedWaveBlocksQueue({
      busy: true,
      queueDepth: 0,
      runningWaveIds: ["T001"],
      doneSet: done,
    }),
    false,
  );
  assert.equal(
    finishedWaveBlocksQueue({
      busy: false,
      queueDepth: 1,
      runningWaveIds: ["T001"],
      doneSet: done,
    }),
    false,
  );
});

test("desk status path calls finishedWaveBlocksQueue before preempt", () => {
  const src = readFileSync(
    new URL("../bin/duaer-live.mjs", import.meta.url),
    "utf8",
  );
  const gate = src.indexOf("finishedWaveBlocksQueue(");
  const preempt = src.indexOf(
    "finished wave still holds the lane; next job is queued",
  );
  assert.ok(gate > 0);
  assert.ok(preempt > gate);
});

test("undoneReleasedFingerprints drops only open task waves", () => {
  const done = new Set(["T001", "T006"]);
  assert.deepEqual(
    undoneReleasedFingerprints(["T001", "T006", "T007", "VERIFY:FAIL:npm test:1"], done),
    ["T007"],
  );
  assert.deepEqual(undoneReleasedFingerprints(["T001,T002"], new Set(["T001"])), [
    "T001,T002",
  ]);
  assert.deepEqual(undoneReleasedFingerprints(["T001"], done), []);
});

test("desk drops an idle undone wave before the next release", () => {
  const src = readFileSync(
    new URL("../bin/duaer-live.mjs", import.meta.url),
    "utf8",
  );
  const drop = src.indexOf("undoneReleasedFingerprints(");
  const release = src.indexOf("pendingWaveReleases(");
  assert.ok(drop > 0);
  assert.ok(release > drop);
});
