/**
 * Project list grouping for project-first desk.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectList,
  normalizeProjectKey,
} from "../bin/live-projects.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("normalizeProjectKey strips trailing slashes", () => {
  assert.equal(normalizeProjectKey("/tmp/foo/"), "/tmp/foo");
  assert.equal(normalizeProjectKey(""), "");
});

test("buildProjectList groups jobs under repo paths", () => {
  const bag = buildProjectList({
    repos: [
      {
        path: "/Users/me/Projects/a",
        name: "Alpha",
        title: "Alpha Desk",
        description: "Invoice summary for ops",
        lastUsedAt: "2026-01-02",
      },
    ],
    jobs: [
      {
        id: "001-x",
        repoPath: "/Users/me/Projects/a",
        goal: "Ship A",
        status: "accepted",
        at: "2026-01-03",
      },
      {
        id: "002-y",
        repoPath: null,
        goal: "Orphan",
        status: "confirmed",
        at: "2026-01-04",
      },
      {
        id: "003-z",
        repoPath: "/Users/me/Projects/b",
        goal: "Ship B",
        status: "dispatched",
        at: "2026-01-05",
      },
    ],
    activeProjectPath: "/Users/me/Projects/a",
  });
  assert.equal(bag.projects.length, 2);
  assert.equal(bag.projects[0].path, "/Users/me/Projects/a");
  assert.equal(bag.projects[0].title, "Alpha Desk");
  assert.equal(bag.projects[0].description, "Invoice summary for ops");
  assert.equal(bag.projects[0].jobs.length, 1);
  assert.equal(bag.projects[0].jobs[0].id, "001-x");
  assert.equal(bag.unassigned.length, 1);
  assert.equal(bag.unassigned[0].id, "002-y");
  const b = bag.projects.find((p) => p.path.endsWith("/b"));
  assert.ok(b);
  assert.equal(b.jobs[0].id, "003-z");
});

test("live sources wire project-first APIs and UI", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /activeProjectPath/);
  assert.match(live, /\/api\/projects/);
  assert.match(live, /NEED_PROJECT/);
  assert.match(live, /NEED_TITLE|NEED_DESCRIPTION/);
  assert.match(live, /buildProjectList/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /data-i18n="project\.toggle"/);
  assert.match(html, /id="projectActivate"/);
  assert.match(html, /id="projectTitle"/);
  assert.match(html, /id="projectDescription"/);
  assert.match(html, /id="projectList"/);
  assert.match(html, /id="projectsRoot"/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /project\.kickoff|sendChat\(/);
  assert.match(js, /activateProjectPath|loadProjectsPanel/);
  assert.match(js, /chatAllowed[\s\S]*projectPath/);
});
