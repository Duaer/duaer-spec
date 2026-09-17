/**
 * Unique feat/ branch allocation for live dispatch.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { allocateUniqueFeatBranch } from "../bin/live-worktree-name.mjs";

test("allocateUniqueFeatBranch keeps preferred when free", () => {
  const out = allocateUniqueFeatBranch("feat/html", {
    jobId: "043-html",
    isTaken: () => false,
  });
  assert.deepEqual(out, { branch: "feat/html", worktreeId: "feat-html" });
});

test("allocateUniqueFeatBranch skips taken worktree then uses job number", () => {
  const taken = new Set(["feat/html", "feat-html"]);
  const out = allocateUniqueFeatBranch("feat/html", {
    jobId: "043-html",
    isTaken: (b, wt) => taken.has(b) || taken.has(wt),
  });
  assert.equal(out.branch, "feat/html-043");
  assert.equal(out.worktreeId, "feat-html-043");
});

test("allocateUniqueFeatBranch falls through to -2 when needed", () => {
  const taken = new Set([
    "feat/html",
    "feat-html",
    "feat/html-043",
    "feat-html-043",
    "feat/043-html",
    "feat-043-html",
  ]);
  const out = allocateUniqueFeatBranch("feat/html", {
    jobId: "043-html",
    isTaken: (b, wt) => taken.has(b) || taken.has(wt),
  });
  assert.equal(out.branch, "feat/html-2");
});

test("live dispatch no longer hard-fails on existing worktree path", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const live = fs.readFileSync(path.join(root, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /allocateUniqueFeatBranch/);
  assert.doesNotMatch(live, /worktree 已存在/);
  assert.match(live, /feat\/\$\{dirName\}/);
});
