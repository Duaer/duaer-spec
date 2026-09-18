/**
 * Parallel Terminal queue lanes for multi digital-employee kickoff.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("live sources isolate Terminal queues per worker lane", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /normalizeTerminalQueueLane/);
  assert.match(live, /function terminalQueueDir\(worktreePath, queueLane/);
  assert.match(live, /queueLane/);
  assert.match(live, /assigned\.workerCount > 1 \? workerId/);
  assert.match(live, /agent-launch-prompt-\$\{lane\}/);
  // Same-worktree lock message must remain for same-lane collisions
  assert.match(live, /another Terminal runner already holds the lock/);
});
