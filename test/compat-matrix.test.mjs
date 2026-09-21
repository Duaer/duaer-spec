import test from "node:test";
import assert from "node:assert/strict";
import { missingCompatMatrix } from "../web/live-dev/compat-matrix.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const covered =
  "Chrome 最近两版、手机 Safari、统信 UOS；云测截图放 compat/；旧壳降级提示升级";

test("missingCompatMatrix rejects a vague or single-browser line", () => {
  assert.deepEqual(missingCompatMatrix("主流浏览器"), [
    "至少两个具体浏览器或国产终端",
    "截图/录屏或云测证据",
    "降级或 Polyfill",
  ]);
  assert.ok(missingCompatMatrix("Chrome latest two").includes("截图/录屏或云测证据"));
  assert.deepEqual(missingCompatMatrix(covered), []);
});

test("task pool injects an FDE-04 compat evidence task", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        deviceMatrix: covered,
        exceptionCases: "空列表；失败可重试；权限不足；超时",
        apiContract: "本模块无 HTTP API",
      },
      dependsOn: [],
    },
  ]);
  const titles = pool.tasks.map((t) => t.title).join("\n");
  assert.match(titles, /FDE-04: compat evidence «Intro»/);
});
