import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "bin", "duaer.mjs");
const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const git = (dir, ...a) =>
  spawnSync("git", ["-C", dir, "-c", "user.email=t@e", "-c", "user.name=t", ...a], { encoding: "utf8" });

test("init reminds to commit the Claude review hook; check warns until it is committed", () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-hookrem-"));
  try {
    git(dir, "init", "-q", "-b", "develop");
    git(dir, "commit", "-q", "--allow-empty", "-m", "init");

    const init = cli("init", dir, "--all");
    assert.match(init.stdout, /Review hooks are not committed yet/);
    assert.match(init.stdout, /git add .*\.claude\/settings\.json/);

    let check = cli("check", dir, "--workplace");
    assert.match(check.stdout, /warn \.claude\/settings\.json not committed/);
    assert.match(check.stdout, /warn \.duaer\/hooks\/review-gate\.mjs not committed/);
    assert.doesNotMatch(check.stdout, /workplace file\(s\) missing/, "full install");
    assert.equal(check.status, 0, "warnings do not fail the check");

    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "duaer");
    assert.doesNotMatch(cli("update", dir).stdout, /Review hooks are not committed/);
    check = cli("check", dir, "--workplace");
    assert.doesNotMatch(check.stdout, /^warn/m);

    // Hook entry removed from settings → told to run update.
    fs.writeFileSync(path.join(dir, ".claude", "settings.json"), "{}\n");
    git(dir, "commit", "-qam", "drop hook");
    assert.match(cli("check", dir, "--workplace").stdout, /no review stop hook — run: duaer update/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("outside git: no reminder, no crash", () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-hookrem-nogit-"));
  try {
    const init = cli("init", dir, "--method");
    assert.equal(init.status, 0, init.stderr);
    assert.doesNotMatch(init.stdout, /Review hooks are not committed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("ops-only install: no hook warnings", () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), "duaer-hookrem-ops-"));
  try {
    git(dir, "init", "-q", "-b", "develop");
    cli("init", dir, "--ops");
    assert.doesNotMatch(cli("check", dir, "--workplace").stdout, /^warn/m);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
