import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "bin", "norm.mjs");

function init(dir, extra = []) {
  return spawnSync(process.execPath, [CLI, "init", dir, "--method", ...extra], {
    encoding: "utf8",
  });
}

test("init installs the method skeleton and an empty specs directory", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "norm-init-omit-"));
  try {
    const run = init(dir);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(
      readFileSync(path.join(dir, ".norm", "memory", "testing.md"), "utf8"),
      readFileSync(path.join(ROOT, ".norm", "memory", "testing.md"), "utf8"),
    );
    assert.ok(existsSync(path.join(dir, ".norm", "templates", "spec-template.md")));
    assert.deepEqual(readdirSync(path.join(dir, ".norm", "specs")), []);
    assert.equal(existsSync(path.join(dir, ".norm", "active-job.json")), false);
    assert.equal(
      existsSync(path.join(dir, ".norm", "specs", "295-ponytail-init")),
      false,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("init --force keeps the adopting project's own job files", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "norm-init-keep-"));
  const specDir = path.join(dir, ".norm", "specs", "001-user-job");
  try {
    mkdirSync(specDir, { recursive: true });
    writeFileSync(path.join(specDir, "spec.md"), "# User job\n", "utf8");
    writeFileSync(
      path.join(dir, ".norm", "active-job.json"),
      JSON.stringify({ feature: "001-user-job" }) + "\n",
      "utf8",
    );
    const run = init(dir, ["--force"]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(
      readFileSync(path.join(specDir, "spec.md"), "utf8"),
      "# User job\n",
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(dir, ".norm", "active-job.json"), "utf8"))
        .feature,
      "001-user-job",
    );
    assert.equal(
      existsSync(path.join(dir, ".norm", "specs", "295-ponytail-init")),
      false,
    );
    assert.ok(existsSync(path.join(dir, ".norm", "memory", "testing.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("npm pack omits packaged job progress", () => {
  const run = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const start = run.stdout.indexOf("[");
  const packed = JSON.parse(run.stdout.slice(start));
  const files = packed[0].files.map((file) => file.path);
  assert.equal(
    files.some((file) => file === ".norm/active-job.json" || file.startsWith(".norm/specs/")),
    false,
  );
  assert.ok(files.includes(".norm/memory/testing.md"));
});
