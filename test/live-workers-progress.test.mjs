import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkersProgress } from "../bin/live-progress.mjs";

test("buildWorkersProgress returns empty for single worker", () => {
  const workers = buildWorkersProgress({
    workerCount: 1,
    launches: [{ workerId: "w1", taskIds: ["T001"] }],
    progress: {
      tasks: [{ id: "T001", text: "T001 do thing", done: false }],
    },
  });
  assert.deepEqual(workers, []);
});

test("buildWorkersProgress splits tasks and states per worker", () => {
  const workers = buildWorkersProgress({
    workerCount: 2,
    launches: [
      { workerId: "w1", taskIds: ["T001", "T002"], agentId: "claude", kind: "worker" },
      { workerId: "w2", taskIds: ["T003"], agentId: "claude", kind: "worker" },
    ],
    progress: {
      tasks: [
        { id: "T001", text: "T001 a", done: true },
        { id: "T002", text: "T002 b", done: false },
        { id: "T003", text: "T003 c", done: false },
      ],
    },
    terminals: {
      w1: { busy: true, queueDepth: 0, runnerHealthy: true },
      w2: { busy: false, queueDepth: 1, runnerHealthy: true },
    },
    logTails: {
      w1: ["[duaer] w1 start"],
      w2: ["[duaer] w2 queued"],
    },
  });
  assert.equal(workers.length, 2);
  assert.equal(workers[0].id, "w1");
  assert.equal(workers[0].state, "running");
  assert.equal(workers[0].done, 1);
  assert.equal(workers[0].total, 2);
  assert.match(workers[0].current, /T002/);
  assert.equal(workers[0].logTail[0], "[duaer] w1 start");
  assert.equal(workers[1].id, "w2");
  assert.equal(workers[1].state, "queued");
  assert.equal(workers[1].total, 1);
});

test("buildWorkersProgress falls back to taskPool workerId", () => {
  const workers = buildWorkersProgress({
    workerCount: 2,
    launches: [{ workerId: "w1" }, { workerId: "w2" }],
    taskPool: {
      tasks: [
        { id: "T001", title: "mod a", workerId: "w1" },
        { id: "T002", title: "mod b", workerId: "w2" },
      ],
    },
    progress: {
      tasks: [
        { id: "T001", text: "T001 mod a", done: true },
        { id: "T002", text: "T002 mod b", done: true },
      ],
    },
  });
  assert.equal(workers[0].state, "done");
  assert.equal(workers[1].state, "done");
  assert.equal(workers[0].tasks[0].done, true);
});
