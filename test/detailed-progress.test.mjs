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

test("splitAcceptanceLines splits sentences and keeps a single clause whole", () => {
  assert.deepEqual(splitAcceptanceLines("打开首页看到主色。标题加大。"), [
    "打开首页看到主色",
    "标题加大",
  ]);
  assert.deepEqual(
    splitAcceptanceLines("Open the form. Submit shows the dashboard."),
    ["Open the form", "Submit shows the dashboard"],
  );
  assert.deepEqual(splitAcceptanceLines("1. Open login 2. See home"), [
    "Open login",
    "See home",
  ]);
  assert.deepEqual(splitAcceptanceLines("Open /login see form"), [
    "Open /login see form",
  ]);
  assert.deepEqual(
    splitAcceptanceLines("Open http://127.0.0.1:8787/login and see the form"),
    ["Open http://127.0.0.1:8787/login and see the form"],
  );
  assert.deepEqual(splitAcceptanceLines("Wait 1.5 seconds. Then show the form."), [
    "Wait 1.5 seconds",
    "Then show the form",
  ]);
  assert.deepEqual(splitAcceptanceLines("(none)"), []);
  assert.deepEqual(splitAcceptanceLines(""), []);
});

test("buildDetailedProductTasksMd does not pad filler atomic steps", () => {
  const md = buildDetailedProductTasksMd({
    goal: "用户能登录。首页显示卡片。",
    acceptance: "",
    deployNeeded: false,
  });
  assert.match(md, /Satisfy acceptance \(alone\): 用户能登录/);
  assert.match(md, /Satisfy acceptance \(alone\): 首页显示卡片/);
  assert.doesNotMatch(md, /atomic step/);
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
  assert.match(md, /Update product README/);
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
  assert.match(block, /Update product README/);
  assert.doesNotMatch(block, /atomic step/);
});

test("buildDetailedRevisionTasksMd splits a multi-sentence change", () => {
  const block = buildDetailedRevisionTasksMd({
    revN: 3,
    change: "Make the hero taller. Keep the footer.",
    acceptance: "Hero is taller",
  });
  assert.match(block, /Apply revision \(alone\): Make the hero taller/);
  assert.match(block, /Apply revision \(alone\): Keep the footer/);
  assert.match(block, /Satisfy revision acceptance \(alone\): Hero is taller/);
  assert.doesNotMatch(block, /atomic step/);
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
  assert.match(live, /更新产品仓 README/);
  assert.doesNotMatch(live, /扩成 8–15 条/);
  assert.doesNotMatch(live, /扩成 6–12 条/);

  const progress = fs.readFileSync(
    path.join(ROOT, "bin/live-progress.mjs"),
    "utf8",
  );
  assert.match(progress, /Update product README/);

  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /progress-activity/);
  assert.match(app, /data\?\.activity/);

  const css = fs.readFileSync(
    path.join(ROOT, "web/live-dev/styles.css"),
    "utf8",
  );
  assert.match(css, /\.progress-activity/);

  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /更新产品 README|update the product README/);
});
