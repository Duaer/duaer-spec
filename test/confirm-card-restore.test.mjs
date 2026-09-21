import test from "node:test";
import assert from "node:assert/strict";
import { restoreConfirmCard } from "../web/live-dev/confirm-card.mjs";

test("restoreConfirmCard keeps baseline fields from a module card", () => {
  const card = restoreConfirmCard({
    id: "main",
    card: {
      goal: "share a page",
      outOfScope: "no blog",
      acceptance: "open the link and see the name",
      assumptions: "static page",
      deviceMatrix: "Chrome latest two",
      criticalPaths: "open link",
      exceptionCases: "avatar fails",
      apiContract: "本模块无 HTTP API",
      envChecklist: "无客户联调环境",
      dataPrecheck: "本模块无导入",
      externalDeps: "本模块无外部依赖",
      perfBudget: "本模块无页面性能要求",
    },
  });
  assert.equal(card.deviceMatrix, "Chrome latest two");
  assert.equal(card.criticalPaths, "open link");
  assert.equal(card.exceptionCases, "avatar fails");
  assert.equal(card.apiContract, "本模块无 HTTP API");
  assert.equal(card.envChecklist, "无客户联调环境");
  assert.equal(card.dataPrecheck, "本模块无导入");
  assert.equal(card.externalDeps, "本模块无外部依赖");
  assert.equal(card.perfBudget, "本模块无页面性能要求");
  assert.equal(card.goal, "share a page");
});

test("restoreConfirmCard accepts a flat card", () => {
  const card = restoreConfirmCard({
    goal: "g",
    apiContract: "openapi/openapi.yaml",
  });
  assert.equal(card.apiContract, "openapi/openapi.yaml");
  assert.equal(card.envChecklist, "");
  assert.equal(card.dataPrecheck, "");
  assert.equal(card.externalDeps, "");
  assert.equal(card.perfBudget, "");
  assert.equal(card.deviceMatrix, "");
});
