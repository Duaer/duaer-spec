/**
 * Deploy target helpers + fine-grained task contracts.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DEPLOY_TARGETS,
  deployPromptForTarget,
  isDeployPlanned,
  normalizeDeployTarget,
} from "../bin/deploy-targets.mjs";
import { buildDetailedProductTasksMd } from "../bin/live-progress.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("normalizeDeployTarget aliases", () => {
  assert.equal(normalizeDeployTarget("cf"), "cloudflare");
  assert.equal(normalizeDeployTarget("alibaba"), "aliyun");
  assert.equal(normalizeDeployTarget("gh-pages"), "github-pages");
  assert.equal(normalizeDeployTarget(""), "none");
  assert.equal(DEPLOY_TARGETS.length, 5);
  assert.equal(isDeployPlanned("cloudflare"), true);
  assert.equal(isDeployPlanned("none"), false);
});

test("Cloudflare prompt includes edge constraints", () => {
  const p = deployPromptForTarget("cloudflare");
  assert.equal(p.needed, true);
  assert.match(p.promptBlock, /Cloudflare/);
  assert.match(p.promptBlock, /Workers/);
  assert.match(p.promptBlock, /fs/);
  assert.match(p.specNote, /Cloudflare/);
});

test("many acceptance lines become many tasks (no 6-cap)", () => {
  const lines = Array.from({ length: 14 }, (_, i) => `- Feature ${i + 1}`);
  const md = buildDetailedProductTasksMd({
    goal: "Big app",
    acceptance: lines.join("\n"),
    deployNeeded: false,
  });
  const boxes = md.match(/^\s*[-*]\s+\[[ xX]\]/gm) || [];
  assert.ok(boxes.length >= 14, `expected ≥14, got ${boxes.length}`);
  assert.match(md, /无条数上限/);
  assert.match(md, /Satisfy acceptance \(alone\): Feature 14/);
});

test("sources: deploy target UI + self-update bootstrap + task split", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /deployTarget/);
  assert.match(live, /deployPromptForTarget/);
  assert.match(live, /不要人为限制条数/);

  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /renderDeployTargetList/);
  assert.match(app, /deployTarget/);

  const html = fs.readFileSync(
    path.join(ROOT, "web/live-dev/index.html"),
    "utf8",
  );
  assert.match(html, /deployTargetList/);

  const duaer = fs.readFileSync(path.join(ROOT, "bin/duaer.mjs"), "utf8");
  assert.match(duaer, /case 'upgrade'/);
  assert.match(duaer, /npm i -g duaer-spec@latest/);

  const docs = fs.readFileSync(
    path.join(ROOT, "docs/agent/deploy-targets.md"),
    "utf8",
  );
  assert.match(docs, /Cloudflare/);
  assert.match(docs, /No durable local filesystem/);
});
