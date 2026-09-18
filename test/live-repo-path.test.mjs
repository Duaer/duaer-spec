/**
 * Product path resolve + mkdir helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ensureProductDir,
  resolveProductRepoPath,
} from "../bin/live-repo-path.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("resolveProductRepoPath joins relative names under projectsRoot", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-home-"));
  const root = path.join(home, "Projects");
  fs.mkdirSync(root);
  try {
    const abs = resolveProductRepoPath("22222", {
      projectsRoot: root,
      home,
    });
    assert.equal(abs, path.join(root, "22222"));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("resolveProductRepoPath requires projectsRoot for relative names", () => {
  assert.throws(
    () =>
      resolveProductRepoPath("only-name", {
        projectsRoot: "",
        home: os.tmpdir(),
      }),
    (err) => err && err.code === "NEED_PROJECTS_ROOT",
  );
});

test("ensureProductDir creates missing absolute path", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-home-"));
  const target = path.join(home, "Projects", "new-app");
  try {
    const r = ensureProductDir(target, { home });
    assert.equal(r.created, true);
    assert.ok(fs.statSync(target).isDirectory());
    const again = ensureProductDir(target, { home });
    assert.equal(again.created, false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("ensureProductDir refuses $HOME and FS root", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-home-"));
  try {
    assert.throws(
      () => ensureProductDir(home, { home }),
      (err) => err && err.code === "REFUSED_PATH",
    );
    assert.throws(
      () => ensureProductDir(path.parse(home).root, { home }),
      (err) => err && err.code === "REFUSED_PATH",
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("live sources wire product dir ensure", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /ensureProductDir/);
  assert.match(live, /resolveProductRepoPath/);
  assert.match(live, /projectsRoot/);
  const html = fs.readFileSync(
    path.join(ROOT, "web/live-dev/index.html"),
    "utf8",
  );
  assert.match(html, /id="projectsRoot"/);
});
