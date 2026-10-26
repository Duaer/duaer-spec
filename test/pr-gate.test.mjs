import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MAX_CI_ROUNDS, parsePrState, prInstructions, readPrConfig } from "../.duaer/hooks/pr-gate.mjs";
import { prGateReopen } from "../bin/live-verify-gate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "duaer.mjs");
const HOOK = path.join(ROOT, ".duaer", "hooks", "review-gate.mjs");
const JOB = "001-demo";
const BRANCH = "feat/demo";
const URL = "https://github.com/o/r/pull/7";

const run = (conclusion, status = "COMPLETED") => ({ __typename: "CheckRun", name: "test", status, conclusion });

test("parsePrState covers every state", () => {
  assert.equal(parsePrState(null).result, "none");
  assert.equal(parsePrState({ url: URL, state: "MERGED" }).result, "merged");
  assert.equal(parsePrState({ url: URL, state: "CLOSED" }).result, "closed");
  assert.equal(parsePrState({ state: "OPEN", statusCheckRollup: [run("", "IN_PROGRESS")] }).result, "pending");
  assert.equal(
    parsePrState({ state: "OPEN", statusCheckRollup: [{ __typename: "StatusContext", context: "ci", state: "PENDING" }] }).result,
    "pending",
  );
  const fail = parsePrState(
    { state: "OPEN", statusCheckRollup: [run("FAILURE"), run("SUCCESS")] },
    [{ headSha: "a", conclusion: "failure" }, { headSha: "a", conclusion: "failure" }],
  );
  assert.deepEqual([fail.result, fail.round, fail.failing], ["fail", 1, ["test"]]);
  const heads = Array.from({ length: MAX_CI_ROUNDS }, (_, i) => ({ headSha: `h${i}`, conclusion: "failure" }));
  assert.equal(parsePrState({ state: "OPEN", statusCheckRollup: [run("FAILURE")] }, heads).result, "stuck");
  assert.equal(
    parsePrState({ state: "OPEN", reviewDecision: "CHANGES_REQUESTED", statusCheckRollup: [run("SUCCESS")] }).result,
    "changes",
  );
  assert.equal(parsePrState({ state: "OPEN", statusCheckRollup: [run("SUCCESS"), run("SKIPPED")] }).result, "ready");
  assert.equal(parsePrState({ state: "OPEN", statusCheckRollup: [] }).result, "ready", "repo without CI");
});

test("readPrConfig is opt-in", () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-prcfg-"));
  try {
    assert.equal(readPrConfig(dir), null);
    fs.mkdirSync(path.join(dir, ".duaer", "memory"), { recursive: true });
    const file = path.join(dir, ".duaer", "memory", "pr.json");
    fs.writeFileSync(file, '{"enabled":false}');
    assert.equal(readPrConfig(dir), null);
    fs.writeFileSync(file, '{"enabled":true}');
    assert.deepEqual(readPrConfig(dir), { base: "develop" });
    fs.writeFileSync(file, '{"enabled":true,"base":"main"}');
    assert.deepEqual(readPrConfig(dir), { base: "main" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("prInstructions names the next step", () => {
  const at = (result, extra = {}) =>
    prInstructions("/b", { result, url: URL, failing: ["test"], round: 1, ...extra }, { base: "develop", branch: BRANCH });
  assert.match(at("none"), /git push -u origin feat\/demo[\s\S]*gh pr create --base develop/);
  assert.match(at("fail"), /gh run view --log-failed/);
  assert.match(at("changes"), /verify each requested change/);
  assert.match(at("ready"), /gh pr merge --merge --delete-branch/);
  assert.match(at("ready"), /"pr": \{ "url"/);
});

test("desk PR reopen: merged keeps, pending/stuck reopen quietly, fail nudges", () => {
  const stamp = { status: "accepted", acceptedAt: "x" };
  const s = (result, extra = {}) => ({ result, url: URL, failing: [], round: 0, ...extra });
  assert.equal(prGateReopen(stamp, "/b", s("merged")), null);
  for (const quiet of ["pending", "stuck"]) {
    const r = prGateReopen(stamp, "/b", s(quiet));
    assert.equal(r.delivery.status, "open");
    assert.equal(r.nudge, null, quiet);
  }
  const fail = prGateReopen(stamp, "/b", s("fail", { failing: ["test"], round: 1 }), { base: "develop", branch: BRANCH });
  assert.deepEqual(fail.gate, { result: "pr", pr: "fail", round: 1, url: URL });
  assert.equal(fail.delivery.gate.pr, "fail");
  assert.match(fail.nudge.instructions, /log-failed/);
  const fail2 = prGateReopen(stamp, "/b", s("fail", { failing: ["test"], round: 2 }));
  assert.notEqual(fail.nudge.fingerprint, fail2.nudge.fingerprint);
});

/** Accepted job + passing review + PR mode, with a fake `gh` on PATH. */
function prRepo(prJson) {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-pr-"));
  const g = (...a) =>
    spawnSync("git", ["-C", dir, "-c", "user.email=t@e", "-c", "user.name=t", ...a], { encoding: "utf8" });
  const feature = path.join(dir, ".duaer", "specs", JOB);
  fs.mkdirSync(feature, { recursive: true });
  fs.mkdirSync(path.join(dir, ".duaer", "memory"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".duaer", "memory", "pr.json"), '{"enabled":true}');
  fs.writeFileSync(path.join(feature, "spec.md"), "# Demo\n");
  fs.writeFileSync(path.join(feature, "tasks.md"), "- [x] T001\n");
  fs.writeFileSync(path.join(feature, "delivery.json"), '{"status":"accepted"}');
  fs.writeFileSync(path.join(dir, ".duaer", "active-job.json"), JSON.stringify({ feature: JOB, branch: BRANCH }));
  fs.writeFileSync(path.join(dir, "app.js"), "1\n");
  g("init", "-q", "-b", "develop");
  g("add", "-A");
  g("commit", "-qm", "init");
  const head = g("rev-parse", "HEAD").stdout.trim();
  fs.writeFileSync(path.join(feature, "review.md"), `Round: 1\nCommit: ${head}\nVerdict: Ship.\n`);
  const bin = path.join(dir, ".fakebin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "pr.json"), JSON.stringify(prJson));
  // Fake gh: pr list → one open PR url; pr view → the fixture; run list → [].
  fs.writeFileSync(
    path.join(bin, "gh"),
    `#!/bin/sh
case "$1 $2" in
  "pr list") echo '[{"url":"${URL}"}]' ;;
  "pr view") cat "${path.join(bin, "pr.json")}" ;;
  "run list") echo '[]' ;;
  *) exit 1 ;;
esac
`,
    { mode: 0o755 },
  );
  fs.appendFileSync(path.join(dir, ".git", "info", "exclude"), ".fakebin/\n");
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
  return { dir, feature, env, bin };
}

test("PR mode: duaer check and the stop hook accept only a merged PR", () => {
  const { dir, feature, env, bin } = prRepo({
    url: URL,
    state: "OPEN",
    headRefName: BRANCH,
    statusCheckRollup: [run("SUCCESS")],
  });
  try {
    let r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8", env });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /PR green but not merged/);
    r = spawnSync(process.execPath, [HOOK, "claude"], { input: "{}", encoding: "utf8", env: { ...env, CLAUDE_PROJECT_DIR: dir } });
    assert.match(JSON.parse(r.stdout).reason, /gh pr merge/);

    fs.writeFileSync(path.join(bin, "pr.json"), JSON.stringify({ url: URL, state: "MERGED", headRefName: BRANCH }));
    fs.writeFileSync(path.join(feature, "delivery.json"), JSON.stringify({ status: "accepted", pr: { url: URL } }));
    r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8", env });
    assert.equal(r.status, 0, r.stdout);
    r = spawnSync(process.execPath, [HOOK, "claude"], { input: "{}", encoding: "utf8", env: { ...env, CLAUDE_PROJECT_DIR: dir } });
    assert.equal(r.stdout, "");

    // A pr.url for another branch's PR does not count.
    fs.writeFileSync(path.join(bin, "pr.json"), JSON.stringify({ url: URL, state: "MERGED", headRefName: "feat/other" }));
    r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8", env });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no PR yet/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("PR mode off: no gh call, local merge flow unchanged", () => {
  const { dir, env } = prRepo({});
  try {
    fs.rmSync(path.join(dir, ".duaer", "memory", "pr.json"));
    const noGh = { ...env, PATH: "/nonexistent" + path.delimiter + path.dirname(process.execPath) + path.delimiter + "/usr/bin:/bin" };
    const r = spawnSync(process.execPath, [CLI, "check", dir, "--delivery", "--strict"], { encoding: "utf8", env: noGh });
    assert.equal(r.status, 0, r.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
