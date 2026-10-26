import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseReview,
  reviewPasses,
  reviewStatus,
} from "../.duaer/hooks/review-gate.mjs";
import { buildBugTaskPool, buildTaskPoolFromModules } from "../bin/live-modules.mjs";
import { reviewGateReopen, verifyNudgePrompt } from "../bin/live-verify-gate.mjs";
import { reviewInstructions } from "../.duaer/hooks/review-gate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "duaer.mjs");
const HOOK = path.join(ROOT, ".duaer", "hooks", "review-gate.mjs");
const JOB = "001-demo";

function git(dir, ...args) {
  const r = spawnSync(
    "git",
    ["-C", dir, "-c", "user.email=t@example.com", "-c", "user.name=t", ...args],
    { encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

/** Git repo with one accepted job; returns { dir, feature, head }. */
function acceptedRepo() {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-review-"));
  const feature = path.join(dir, ".duaer", "specs", JOB);
  fs.mkdirSync(feature, { recursive: true });
  fs.writeFileSync(path.join(feature, "spec.md"), "# Demo\n");
  fs.writeFileSync(path.join(feature, "tasks.md"), "- [x] T001 done\n");
  fs.writeFileSync(path.join(feature, "delivery.json"), '{"status":"accepted"}\n');
  fs.writeFileSync(path.join(dir, ".duaer", "active-job.json"), `{"feature":"${JOB}"}\n`);
  fs.writeFileSync(path.join(dir, "app.js"), "export const a = 1;\n");
  git(dir, "init", "-q", "-b", "develop");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  return { dir, feature, head: git(dir, "rev-parse", "HEAD") };
}

function writeReview(feature, body) {
  fs.writeFileSync(path.join(feature, "review.md"), body);
}

function runHook(host, dir, input = {}) {
  return spawnSync(process.execPath, [HOOK, host], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: host === "claude" ? dir : "" },
    cwd: dir,
  });
}

test("parseReview reads verdict, round and commit", () => {
  assert.deepEqual(
    parseReview("Round: 2\nCommit: abc1234\n...\nVerdict: fix 1 and 3 first."),
    { ship: false, verdict: "fix 1 and 3 first.", round: 2, commit: "abc1234" },
  );
  assert.equal(parseReview("**Verdict:** Ship.").ship, true);
  assert.equal(parseReview("What this change does: x\n\nLooks good. Ship.").ship, true);
  assert.equal(parseReview("no verdict here").ship, false);
});

test("reviewStatus: missing, fix, stuck, pass, stale, waived", () => {
  const { dir, feature, head } = acceptedRepo();
  try {
    assert.equal(reviewStatus(feature, dir).result, "missing");
    writeReview(feature, `Round: 1\nCommit: ${head}\nVerdict: fix 1 first.\n`);
    assert.equal(reviewStatus(feature, dir).result, "fix");
    writeReview(feature, `Round: 2\nCommit: ${head}\nVerdict: fix 1 first.\n`);
    assert.equal(reviewStatus(feature, dir).result, "stuck");
    writeReview(feature, `Round: 2\nCommit: ${head}\nVerdict: Ship.\n`);
    assert.equal(reviewStatus(feature, dir).result, "pass");
    // Brief edits do not make the review stale; code edits do.
    fs.writeFileSync(path.join(feature, "tasks.md"), "- [x] T001 done\n- [x] T002\n");
    assert.equal(reviewStatus(feature, dir).result, "pass");
    fs.writeFileSync(path.join(dir, "app.js"), "export const a = 2;\n");
    assert.equal(reviewStatus(feature, dir).result, "stale");
    fs.writeFileSync(path.join(dir, "app.js"), "export const a = 1;\n");
    fs.writeFileSync(path.join(dir, "new.js"), "x\n");
    assert.equal(reviewStatus(feature, dir).result, "stale");
    fs.rmSync(path.join(dir, "new.js"));
    writeReview(feature, "Verdict: Ship.\n");
    assert.equal(reviewStatus(feature, dir).result, "stale", "no Commit line in a git repo");
    fs.rmSync(path.join(feature, "review.md"));
    fs.mkdirSync(path.join(dir, ".duaer", "memory"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".duaer", "memory", "verify.json"), '{"waiver":"docs-only"}');
    assert.ok(reviewPasses(reviewStatus(feature, dir)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("duaer check / job treat accepted without a passing review as not accepted", () => {
  const { dir, feature, head } = acceptedRepo();
  try {
    let r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /no review\.md/);
    r = spawnSync(process.execPath, [CLI, "job", dir], { encoding: "utf8" });
    assert.match(r.stdout, /not done/);
    writeReview(feature, `Round: 1\nCommit: ${head}\nVerdict: Ship.\n`);
    r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout);
    r = spawnSync(process.execPath, [CLI, "job", dir], { encoding: "utf8" });
    assert.match(r.stdout, /accepted/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("stop hooks block only a claimed accept that fails review", () => {
  const { dir, feature, head } = acceptedRepo();
  try {
    let r = runHook("claude", dir);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.decision, "block");
    assert.match(out.reason, /ponytail-review/);
    assert.equal(runHook("claude", dir, { stop_hook_active: true }).stdout, "");

    r = runHook("cursor", dir, { workspace_roots: [dir], loop_count: 0 });
    assert.match(JSON.parse(r.stdout).followup_message, /review\.md/);
    assert.equal(runHook("cursor", dir, { workspace_roots: [dir], loop_count: 2 }).stdout, "");

    writeReview(feature, `Round: 1\nCommit: ${head}\nVerdict: Ship.\n`);
    assert.equal(runHook("claude", dir).stdout, "");

    fs.writeFileSync(path.join(feature, "delivery.json"), '{"status":"open"}\n');
    fs.rmSync(path.join(feature, "review.md"));
    assert.equal(runHook("claude", dir).stdout, "", "not claimed accepted");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("stop hook checks jobs inside .worktree checkouts", () => {
  const { dir } = acceptedRepo();
  const project = fs.mkdtempSync(path.join(tmpdir(), "duaer-review-proj-"));
  try {
    fs.mkdirSync(path.join(project, ".worktree"));
    fs.renameSync(dir, path.join(project, ".worktree", "feat-demo"));
    const out = JSON.parse(runHook("claude", project).stdout);
    assert.equal(out.decision, "block");
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("init installs Ponytail skills on every host and merges stop hooks", () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-init-review-"));
  try {
    fs.mkdirSync(path.join(dir, ".claude"));
    const mine = { hooks: { Stop: [{ hooks: [{ type: "command", command: "echo mine" }] }] } };
    fs.writeFileSync(path.join(dir, ".claude", "settings.json"), JSON.stringify(mine));
    for (const cmd of ["init", "update"]) {
      const r = spawnSync(process.execPath, [CLI, cmd, dir, "--method"], { encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr || r.stdout);
    }
    for (const host of [".claude", ".cursor", ".agents"]) {
      for (const name of ["ponytail", "ponytail-review"]) {
        assert.ok(fs.existsSync(path.join(dir, host, "skills", name, "SKILL.md")), `${host}/${name}`);
      }
    }
    assert.ok(fs.existsSync(path.join(dir, ".duaer", "hooks", "review-gate.mjs")));
    const claude = JSON.parse(fs.readFileSync(path.join(dir, ".claude", "settings.json"), "utf8"));
    const cmds = claude.hooks.Stop.flatMap((h) => h.hooks.map((x) => x.command));
    assert.equal(cmds[0], "echo mine");
    assert.equal(cmds.filter((c) => c.includes("review-gate.mjs")).length, 1);
    const cursor = JSON.parse(fs.readFileSync(path.join(dir, ".cursor", "hooks.json"), "utf8"));
    assert.equal(cursor.hooks.stop.length, 1);
    assert.match(cursor.hooks.stop[0].command, /review-gate\.mjs cursor/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("task pools put the review task right before the accept stamp", () => {
  const card = { goal: "Do it", acceptance: "Works", outOfScope: "", assumptions: "" };
  const feature = buildTaskPoolFromModules([{ id: "m1", title: "M1", status: "confirmed", card }]);
  const bug = buildBugTaskPool([{ id: "b1", title: "B1", status: "confirmed", kind: "bug", card }]);
  for (const pool of [feature, bug]) {
    const i = pool.tasks.findIndex((t) => /ponytail-review/.test(t.title));
    assert.ok(i > 0, "review task present");
    const review = pool.tasks[i];
    const stamp = pool.tasks[i + 1];
    assert.equal(review.role, "verify-l3");
    assert.match(stamp.title, /stamp delivery\.json accepted/i);
    assert.deepEqual(stamp.dependsOn, [review.id]);
  }
});

test("review nudge prompt carries the gate instructions", () => {
  const text = verifyNudgePrompt({
    nudge: { result: "review", instructions: "run ponytail-review" },
    worktreePath: "/w",
    featureDir: "/w/.duaer/specs/x",
  });
  assert.match(text, /run ponytail-review/);
  assert.match(text, /\/w/);
});

test("desk reopen: failing review reopens, stuck stops nudging, pass keeps the stamp", () => {
  const stamp = { status: "accepted", acceptedAt: "2026-10-26T00:00:00Z", preview: { url: "x" } };
  assert.equal(reviewGateReopen(stamp, "/b", { result: "pass", round: 1, verdict: "Ship." }), null);
  assert.equal(reviewGateReopen(stamp, "/b", { result: "waived", round: 0, verdict: "" }), null);

  const fix = reviewGateReopen(stamp, "/b", { result: "fix", round: 1, verdict: "fix 1 first." });
  assert.equal(fix.delivery.status, "open");
  assert.equal(fix.delivery.acceptedAt, undefined);
  assert.equal(fix.delivery.preview.url, "x");
  assert.deepEqual(fix.gate, { result: "review", review: "fix", round: 1 });
  assert.match(fix.nudge.instructions, /Round: 2/);
  assert.equal(stamp.status, "accepted", "input not mutated");

  const stuck = reviewGateReopen(stamp, "/b", { result: "stuck", round: 2, verdict: "fix 1 first." });
  assert.equal(stuck.delivery.status, "open");
  assert.equal(stuck.nudge, null);
});

test("a stale review after Ship starts a new round cycle", () => {
  assert.match(reviewInstructions("/b", { result: "stale", round: 2, verdict: "Ship." }), /Round: 1/);
  assert.match(reviewInstructions("/b", { result: "fix", round: 1, verdict: "fix 1" }), /Round: 2/);
});
