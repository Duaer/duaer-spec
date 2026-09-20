import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("live dispatch prompts forbid early Job not accepted yet", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /DISPATCH_MUST_FINISH_RULES/);
  assert.match(live, /禁止半途收尾/);
  assert.match(live, /evaluateVerifyGate/);
  assert.doesNotMatch(live, /__ACCEPT_NUDGE__/);
  assert.match(live, /本波完成，退出等编排器/);
  assert.doesNotMatch(live, /静默停等编排器/);
  assert.doesNotMatch(
    live,
    /本波全部改成 - \[x\] 后停止；不要开始未放行/,
  );
});

test("duaer-do skill requires finish for live-dispatch", () => {
  const skill = fs.readFileSync(
    path.join(ROOT, ".cursor/skills/duaer-do/SKILL.md"),
    "utf8",
  );
  assert.match(skill, /live-dispatch/);
  assert.match(skill, /Do not\*\* end with.*Job not accepted yet/s);
});
