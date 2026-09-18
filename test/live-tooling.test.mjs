/**
 * Git ensure + 10-day worker CLI upgrade helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CLI_UPGRADE_TTL_MS,
  ensureGitInstalled,
  ensureWorkerClisFresh,
  isCliCheckDue,
} from "../bin/live-tooling.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("isCliCheckDue: missing or stale cache is due; fresh is not", () => {
  const now = Date.parse("2026-09-18T00:00:00.000Z");
  assert.equal(isCliCheckDue(null, now), true);
  assert.equal(isCliCheckDue({}, now), true);
  assert.equal(
    isCliCheckDue({ checkedAt: "2026-09-17T00:00:00.000Z" }, now),
    false,
  );
  assert.equal(
    isCliCheckDue(
      { checkedAt: "2026-09-01T00:00:00.000Z" },
      now,
      CLI_UPGRADE_TTL_MS,
    ),
    true,
  );
});

test("ensureGitInstalled returns already when git on PATH", () => {
  const r = ensureGitInstalled(() => "/usr/bin/git", () => {
    throw new Error("should not install");
  });
  assert.equal(r.ok, true);
  assert.equal(r.action, "already");
  assert.equal(r.path, "/usr/bin/git");
});

test("ensureGitInstalled throws GIT_MISSING when install fails", () => {
  assert.throws(
    () =>
      ensureGitInstalled(
        () => null,
        () => ({ status: 1, stdout: "", stderr: "fail" }),
      ),
    (err) => err && err.code === "GIT_MISSING",
  );
});

test("ensureWorkerClisFresh skips when DUAER_NO_CLI_UPGRADE=1", () => {
  const prev = process.env.DUAER_NO_CLI_UPGRADE;
  process.env.DUAER_NO_CLI_UPGRADE = "1";
  try {
    const r = ensureWorkerClisFresh(
      () => "/usr/bin/agent",
      () => {
        throw new Error("should not upgrade");
      },
    );
    assert.equal(r.skipped, true);
    assert.equal(r.reason, "DUAER_NO_CLI_UPGRADE=1");
  } finally {
    if (prev === undefined) delete process.env.DUAER_NO_CLI_UPGRADE;
    else process.env.DUAER_NO_CLI_UPGRADE = prev;
  }
});

test("ensureWorkerClisFresh upgrades installed CLIs when due and stamps cache", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-cli-"));
  const prevHome = process.env.DUAER_HOME;
  process.env.DUAER_HOME = tmp;
  delete process.env.DUAER_NO_CLI_UPGRADE;
  try {
    const which = (cmd) => {
      if (cmd === "agent") return "/fake/agent";
      if (cmd === "claude") return "/fake/claude";
      return null;
    };
    const calls = [];
    const runChild = (label, command, args) => {
      calls.push({ label, command, args });
      return { status: 0, stdout: "1.2.3\n", stderr: "" };
    };
    const r = ensureWorkerClisFresh(which, runChild, { force: true });
    assert.equal(r.skipped, false);
    assert.equal(r.due, true);
    assert.ok(r.results.some((x) => x.id === "cursor-agent" && x.ok));
    assert.ok(r.results.some((x) => x.id === "claude" && x.ok));
    assert.ok(calls.some((c) => c.label.includes("升级")));

    const cachePath = path.join(tmp, "cli-tools-check.json");
    assert.ok(fs.existsSync(cachePath));
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    assert.ok(cache.checkedAt);
    assert.ok(cache.tools["cursor-agent"]);

    const again = ensureWorkerClisFresh(which, () => {
      throw new Error("should skip within 10d");
    });
    assert.equal(again.skipped, true);
    assert.equal(again.reason, "within-10d");
  } finally {
    if (prevHome === undefined) delete process.env.DUAER_HOME;
    else process.env.DUAER_HOME = prevHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("live sources wire git ensure + 10d CLI refresh", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /ensureGitInstalled/);
  assert.match(live, /ensureWorkerClisFresh|maybeRefreshWorkerClis/);
  assert.match(live, /claudeCliVersion/);
  assert.match(live, /Worker CLI 10d check/);
  assert.match(live, /from "\.\/live-tooling\.mjs"/);
});
