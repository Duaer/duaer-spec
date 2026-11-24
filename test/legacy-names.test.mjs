import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { adoptLegacyEnv, migrateLegacyHome, migrateLegacyRepo } from "../bin/legacy-names.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function put(root, rel, text = "x") {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), text);
}

test("DUAER_* env fills NORM_* only when unset", () => {
  const env = { DUAER_HOME: "/old", DUAER_NO_UPDATE_CHECK: "1", NORM_NO_UPDATE_CHECK: "0" };
  adoptLegacyEnv(env);
  assert.equal(env.NORM_HOME, "/old");
  assert.equal(env.NORM_NO_UPDATE_CHECK, "0");
});

test("~/.duaer merges into an existing ~/.norm without overwriting", () => {
  const home = mkdtempSync(path.join(tmpdir(), "norm-home-merge-"));
  try {
    put(home, ".norm/tools/archify/new", "new");
    put(home, ".duaer/tools/archify/old", "old");
    put(home, ".duaer/live/desk.sqlite", "db");
    migrateLegacyHome(home, {});
    assert.equal(readFileSync(path.join(home, ".norm/live/desk.sqlite"), "utf8"), "db");
    assert.ok(existsSync(path.join(home, ".norm/tools/archify/new")));
    assert.ok(existsSync(path.join(home, ".duaer/tools/archify/old")), "clash left in place");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("~/.duaer moves to ~/.norm, skipped under node --test", () => {
  const home = mkdtempSync(path.join(tmpdir(), "norm-home-"));
  try {
    put(home, ".duaer/live/desk.sqlite");
    migrateLegacyHome(home, { NODE_TEST_CONTEXT: "child" });
    assert.ok(existsSync(path.join(home, ".duaer")), "skipped under node --test");
    migrateLegacyHome(home, {});
    assert.ok(existsSync(path.join(home, ".norm/live/desk.sqlite")));
    assert.ok(!existsSync(path.join(home, ".duaer")));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("update moves a duaer-spec install onto Norm names", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "norm-legacy-repo-"));
  try {
    put(dir, ".duaer/duaer-init.json", JSON.stringify({ mode: "method", branch: "develop" }));
    put(dir, ".duaer/specs/001-old/spec.md", "# old job");
    put(dir, "DUADER.md");
    put(dir, ".cursor/rules/duaer-spec.mdc");
    put(dir, ".claude/rules/duaer-spec.md");
    put(dir, ".cursor/skills/duaer-do/SKILL.md");
    put(dir, ".claude/skills/my-own/SKILL.md");
    put(dir, ".claude/settings.json", JSON.stringify({
      hooks: { Stop: [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/.duaer/hooks/review-gate.mjs" claude' }] }] },
    }));

    assert.ok(migrateLegacyRepo(dir).length > 0);
    assert.equal(readFileSync(path.join(dir, ".norm/specs/001-old/spec.md"), "utf8"), "# old job");
    assert.ok(existsSync(path.join(dir, ".norm/norm-init.json")));
    assert.ok(existsSync(path.join(dir, "NORM.md")));
    for (const gone of [".duaer", "DUADER.md", ".cursor/rules/duaer-spec.mdc", ".claude/rules/duaer-spec.md", ".cursor/skills/duaer-do"]) {
      assert.ok(!existsSync(path.join(dir, gone)), gone);
    }
    assert.ok(existsSync(path.join(dir, ".claude/skills/my-own/SKILL.md")));

    const run = spawnSync(process.execPath, [path.join(ROOT, "bin", "norm.mjs"), "update", dir], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const settings = readFileSync(path.join(dir, ".claude/settings.json"), "utf8");
    assert.ok(!settings.includes(".duaer/"));
    assert.equal(settings.split("review-gate.mjs").length - 1, 1, "one review hook, not a duplicate");
    assert.ok(existsSync(path.join(dir, ".cursor/skills/norm-do/SKILL.md")));
    assert.ok(existsSync(path.join(dir, ".claude/rules/norm.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
