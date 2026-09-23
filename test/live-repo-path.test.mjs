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
  assertProductDirFreeForCreate,
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

test("assertProductDirFreeForCreate refuses an existing directory", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-home-"));
  const target = path.join(home, "Projects", "taken");
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, "keep.txt"), "do not wipe\n");
  try {
    assert.throws(
      () => assertProductDirFreeForCreate(target),
      (err) => err && err.code === "PATH_EXISTS",
    );
    assert.equal(
      fs.readFileSync(path.join(target, "keep.txt"), "utf8"),
      "do not wipe\n",
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("assertProductDirFreeForCreate allows a missing path", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-home-"));
  const target = path.join(home, "Projects", "fresh");
  try {
    assert.equal(assertProductDirFreeForCreate(target), path.resolve(target));
    assert.equal(fs.existsSync(target), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("live sources wire product dir ensure", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /assertProductDirFreeForCreate/);
  assert.match(live, /body\.create === true|create === true/);
  assert.doesNotMatch(live, /isNew = Boolean\(ensured\.created\) \|\| !existing/);
  assert.match(live, /resolveProductRepoPath/);
  assert.match(live, /projectsRoot/);
  assert.match(live, /\/api\/projects\/pick-root/);
  assert.match(live, /选择产品父目录/);
  assert.match(live, /tell application "Finder"/);
  assert.match(live, /await pickFolderNative/);
  assert.doesNotMatch(
    live,
    /spawnSync\(\s*"osascript"/,
  );
  const html = fs.readFileSync(
    path.join(ROOT, "web/live-dev/index.html"),
    "utf8",
  );
  assert.match(html, /id="projectsRoot"/);
  assert.match(html, /readonly/);
  assert.match(html, /projects-root-field/);
  assert.match(html, /id="pickProjectsRoot"/);
  assert.match(html, /id="clearProjectsRoot"/);
  assert.doesNotMatch(html, /id="saveProjectsRoot"/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /\/api\/projects\/pick-root/);
  assert.match(js, /pickProjectsRoot/);
  assert.match(js, /el\.projectsRoot\?\.addEventListener\("click"/);
  assert.match(js, /create:\s*true/);
});
