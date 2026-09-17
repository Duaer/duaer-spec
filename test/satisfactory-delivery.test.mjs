/**
 * Checkable-acceptance local gate (mirrors bin/duaer-live.mjs).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function acceptanceLooksCheckable(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return /打开|看到|显示|点击|返回|为空|出现|通过|等于|包含|列表|页面|接口|按钮|标题|颜色|导航|首页|登录|公告|截图|对照|#[0-9a-fA-F]{3,8}|npm\s|test:|http|curl|\.html|\.json|passes?\b|shows?\b|returns?\b|opens?\b|click\b|empty\b|status\s*\d{3}|assert\b|expect\b/i.test(
    t,
  );
}

function acceptanceLooksVague(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return /更好用|更好看|更美观|更漂亮|更流畅|优化体验|提升体验|用户满意|看起来不错|(?:^|[\s,.;:，。；])(better|nicer|prettier|more beautiful|improved ux|looks?\s+better|polish(?:ed)?|more polished)(?:$|[\s,.;:])/i.test(
    t,
  );
}

function localAcceptCheck(card) {
  const issues = [];
  const goal = String(card.goal || "").trim();
  const acceptance = String(card.acceptance || "").trim();
  if (goal.length < 8) {
    issues.push("「要做什么」过短，写清单一可执行目标");
  }
  if (acceptance.length < 12) {
    issues.push("「验收标准」过短，写清可核对的完成结果");
  } else if (acceptanceLooksVague(acceptance) && !acceptanceLooksCheckable(acceptance)) {
    issues.push(
      "「验收标准」太空泛（如更好用/更好看）；请写可检查结果：打开何处、看到什么、哪条命令通过",
    );
  } else if (!acceptanceLooksCheckable(acceptance) && acceptance.length < 40) {
    issues.push(
      "「验收标准」须可客观检查（打开/看到/点击/命令通过等），避免无法核对的形容词",
    );
  }
  return issues;
}

test("vague acceptance fails local gate", () => {
  const issues = localAcceptCheck({
    goal: "Improve the homepage look and feel",
    acceptance: "看起来更好用更好看",
  });
  assert.ok(issues.some((x) => /空泛|可检查|过短/.test(x)));
});

test("English vague acceptance fails local gate", () => {
  const issues = localAcceptCheck({
    goal: "Polish the landing page design",
    acceptance: "Make it look better and nicer",
  });
  assert.ok(issues.length >= 1);
});

test("checkable acceptance passes local gate", () => {
  const issues = localAcceptCheck({
    goal: "Add announcements nav entry on home",
    acceptance: "打开首页可点「公告」；列表按时间倒序；npm run test:live passes",
  });
  assert.deepEqual(issues, []);
});

test("live sources include checkable-acceptance helpers", () => {
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function acceptanceLooksCheckable/);
  assert.match(live, /function acceptanceLooksVague/);
  assert.match(live, /满意的成品/);
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.match(readme, /norms → satisfactory delivery/i);
  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /card\.acceptHint/);
});
