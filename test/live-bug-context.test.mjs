/**
 * Bug chat project-delivery autofill helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectBugProjectContext,
  enrichBugAssumptions,
  filterBugDeliveryFactIssues,
  formatBugProjectContextBlock,
  isBugDeliveryFactIssue,
} from "../bin/live-bug-context.mjs";

test("isBugDeliveryFactIssue matches common gate phrases", () => {
  assert.equal(isBugDeliveryFactIssue("缺少具体网页地址（URL）"), true);
  assert.equal(isBugDeliveryFactIssue("缺少服务启动命令/脚本及启动方式"), true);
  assert.equal(isBugDeliveryFactIssue("缺少运行环境信息（机器、端口、依赖）"), true);
  assert.equal(isBugDeliveryFactIssue("疑似原因未给出，无法判断修复方向"), true);
  assert.equal(isBugDeliveryFactIssue("是否线上紧急未确认"), true);
  assert.equal(isBugDeliveryFactIssue("现象与复现步骤不清楚"), false);
});

test("filterBugDeliveryFactIssues drops delivery-fact noise", () => {
  const kept = filterBugDeliveryFactIssues([
    "缺少具体网页地址（URL）",
    "复现步骤不完整",
    "是否线上紧急未确认",
  ]);
  assert.deepEqual(kept, ["复现步骤不完整"]);
});

test("collectBugProjectContext reads package scripts and preview", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-bug-ctx-"));
  try {
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        scripts: { start: "node server.js", dev: "node --watch server.js" },
      }),
    );
    fs.writeFileSync(
      path.join(root, "server.js"),
      "require('http').createServer().listen(3456)\n",
    );
    const ctx = collectBugProjectContext({
      projectPath: root,
      previewUrl: "http://127.0.0.1:3456/",
    });
    assert.equal(ctx.previewUrl, "http://127.0.0.1:3456/");
    assert.ok(ctx.startHints.some((h) => /npm start|npm run start/.test(h)));
    assert.equal(ctx.onlineEmergencyDefault, false);
    const block = formatBugProjectContextBlock(ctx);
    assert.match(block, /禁止再向用户追问/);
    assert.match(block, /3456/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("enrichBugAssumptions fills defaults without duplicating", () => {
  const ctx = {
    previewUrl: "http://localhost:3000",
    startHints: ["npm start"],
    projectPath: "/tmp/demo",
    machine: "local desk host (active project)",
    suspectedCauseDefault: "待复现定位",
  };
  const once = enrichBugAssumptions("", ctx);
  assert.match(once, /成品地址: http:\/\/localhost:3000/);
  assert.match(once, /线上紧急: 否/);
  assert.match(once, /疑似原因: 待复现定位/);
  const twice = enrichBugAssumptions(once, ctx);
  assert.equal(twice, once);
});
