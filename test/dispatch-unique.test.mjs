/**
 * Unique feat/ / fix/ branch allocation for live dispatch.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  allocateUniqueBranch,
  allocateUniqueFeatBranch,
} from "../bin/live-worktree-name.mjs";

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

test("allocateUniqueBranch keeps preferred fix/ when free", () => {
  const out = allocateUniqueBranch("fix/login-crash", {
    kind: "fix",
    isTaken: () => false,
  });
  assert.deepEqual(out, {
    branch: "fix/login-crash",
    worktreeId: "fix-login-crash",
  });
});

test("allocateUniqueBranch skips taken fix worktree then uses job number", () => {
  const taken = new Set(["fix/login-crash", "fix-login-crash"]);
  const out = allocateUniqueBranch("fix/login-crash", {
    kind: "fix",
    jobId: "042-login-crash",
    isTaken: (b, wt) => taken.has(b) || taken.has(wt),
  });
  assert.equal(out.branch, "fix/login-crash-042");
  assert.equal(out.worktreeId, "fix-login-crash-042");
});

test("live dispatch allocates feat or fix and no longer hard-fails on existing worktree", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const live = fs.readFileSync(path.join(root, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /allocateUniqueBranch/);
  assert.doesNotMatch(live, /worktree 已存在/);
  assert.match(live, /fix\/\$\{dirName\}/);
  assert.match(live, /feat\/\$\{dirName\}/);
  assert.match(live, /BUG_CHAT_PROMPT/);
  assert.match(live, /buildBugTaskPool/);
  assert.match(live, /live-bug-context/);
  assert.match(live, /禁止向用户追问/);
});
