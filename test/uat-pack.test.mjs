import test from "node:test";
import assert from "node:assert/strict";
import { missingUatCases, uatMentionsErrorCode } from "../web/live-dev/uat-pack.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const covered =
  "空列表提示；提交失败可重试；权限不足；请求超时；错误码 403";

test("missingUatCases lists uncovered UAT classes", () => {
  assert.deepEqual(missingUatCases("empty card fails validate"), [
    "权限不足",
    "超时",
    "重试",
  ]);
  assert.deepEqual(missingUatCases(covered), []);
  assert.equal(uatMentionsErrorCode(covered), true);
  assert.equal(uatMentionsErrorCode("空列表；失败可重试；权限不足；超时"), false);
});

test("task pool injects FDE-07 UAT tasks", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        exceptionCases: covered,
        apiContract: "openapi/openapi.yaml",
      },
      dependsOn: [],
    },
  ]);
  const titles = pool.tasks.map((t) => t.title).join("\n");
  assert.match(titles, /FDE-07: UAT pack «Intro»/);
  assert.match(titles, /FDE-07: align UAT failures with contract error codes/);
});

test("task pool skips contract error-code task when there is no HTTP API", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        exceptionCases: "空列表；失败可重试；权限不足；超时",
        apiContract: "本模块无 HTTP API",
      },
      dependsOn: [],
    },
  ]);
  const titles = pool.tasks.map((t) => t.title).join("\n");
  assert.match(titles, /FDE-07: UAT pack/);
  assert.doesNotMatch(titles, /align UAT failures/);
});
