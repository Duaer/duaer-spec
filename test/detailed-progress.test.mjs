/**
 * Detailed coding progress: richer tasks.md + worktree activity parsing.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildDetailedProductTasksMd,
  buildDetailedRevisionTasksMd,
  parseWorktreeActivityFromGit,
  splitAcceptanceLines,
} from "../bin/live-progress.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("splitAcceptanceLines splits bullets and semicolons", () => {
  assert.deepEqual(
    splitAcceptanceLines(`- One page
- Dark theme
- Mobile ok`),
    ["One page", "Dark theme", "Mobile ok"],
  );
  assert.equal(splitAcceptanceLines("A; B；C").length, 3);
});

test("buildDetailedProductTasksMd yields ≥6 checkboxes", () => {
  const md = buildDetailedProductTasksMd({
    goal: "Landing page for tea shop",
    acceptance: `- Hero with brand
- Contact form
- Mobile layout`,
    deployNeeded: false,
  });
  const boxes = md.match(/^\s*[-*]\s+\[[ xX]\]/gm) || [];
  assert.ok(boxes.length >= 6, `expected ≥6, got ${boxes.length}`);
  assert.match(md, /T001/);
  assert.match(md, /Satisfy acceptance \(alone\): Hero with brand/);
  assert.match(md, /[Ss]tamp delivery\.json accepted/);
});

test("buildDetailedProductTasksMd includes deploy task when needed", () => {
  const md = buildDetailedProductTasksMd({
    goal: "Static site",
    acceptance: "Public URL on Pages",
    deployNeeded: true,
  });
  assert.match(md, /Deploy with GitHub CLI/);
});

test("buildDetailedProductTasksMd uses custom deployTaskText", () => {
  const md = buildDetailedProductTasksMd({
    goal: "Edge app",
    acceptance: "Works on Workers",
    deployNeeded: true,
    deployTaskText: "Prepare Cloudflare Pages/Workers layout",
  });
  assert.match(md, /Prepare Cloudflare Pages\/Workers layout/);
});

test("buildDetailedRevisionTasksMd yields ≥5 R{n}-* boxes", () => {
  const block = buildDetailedRevisionTasksMd({
    revN: 2,
    change: "Make hero taller",
    acceptance: `- Taller hero
- Keep footer`,
  });
  const boxes = block.match(/^\s*[-*]\s+\[[ xX]\]\s+R2-/gm) || [];
  assert.ok(boxes.length >= 5, `expected ≥5, got ${boxes.length}`);
  assert.match(block, /Apply revision: Make hero taller/);
});

test("parseWorktreeActivityFromGit prefers product files in summary", () => {
  const act = parseWorktreeActivityFromGit({
    porcelain: ` M .duaer/specs/001-x/tasks.md
 M src/app.js
?? public/index.html`,
    limit: 10,
  });
  assert.ok(act.files.length >= 2);
  assert.match(act.summary, /src\/app\.js|public\/index\.html/);
  assert.doesNotMatch(act.summary, /\.duaer/);
});

test("live sources wire detailed progress + activity UI", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /buildDetailedProductTasksMd/);
  assert.match(live, /buildDetailedRevisionTasksMd/);
  assert.match(live, /worktreeActivity/);
  assert.match(live, /activity,/);
  assert.match(live, /不要人为限制条数/);
  assert.doesNotMatch(live, /扩成 8–15 条/);
  assert.doesNotMatch(live, /扩成 6–12 条/);

  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /progress-activity/);
  assert.match(app, /data\?\.activity/);

  const css = fs.readFileSync(
    path.join(ROOT, "web/live-dev/styles.css"),
    "utf8",
  );
  assert.match(css, /\.progress-activity/);
});
