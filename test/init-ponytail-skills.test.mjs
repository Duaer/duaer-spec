import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = ["ponytail", "ponytail-review"];

function skillText(root, name) {
  return readFileSync(
    path.join(root, ".claude", "skills", name, "SKILL.md"),
    "utf8",
  );
}

test("init copies packaged Ponytail skills into .claude/skills", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "duaer-init-ponytail-"));
  try {
    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, "bin", "duaer.mjs"), "init", dir, "--method"],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stderr || run.stdout);
    for (const name of SKILLS) {
      assert.equal(skillText(dir, name), skillText(ROOT, name));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
