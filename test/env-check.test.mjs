import test from "node:test";
import assert from "node:assert/strict";
import {
  envChecklistDeclaresNoCustomer,
  envChecklistNeedsProbe,
  missingEnvChecklist,
} from "../web/live-dev/env-check.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const passed =
  "DNS pass; TLS pass; CORS pass; auth pass; third-party reachable";

test("missingEnvChecklist rejects vague, partial, and failed probes", () => {
  assert.ok(missingEnvChecklist("环境正常").includes("DNS"));
  assert.ok(missingEnvChecklist("DNS pass").includes("CORS"));
  assert.ok(
    missingEnvChecklist(
      "DNS 通过；TLS 失败；CORS 通过；鉴权通过；第三方可达",
    ).includes("存在未通过项，不能开工"),
  );
  assert.deepEqual(missingEnvChecklist(passed), []);
  assert.deepEqual(missingEnvChecklist("无客户联调环境"), []);
  assert.equal(envChecklistDeclaresNoCustomer("no customer environment"), true);
});

test("task pool injects an FDE-03 probe before implement", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        deviceMatrix: "Chrome latest two",
        exceptionCases: "空列表",
        apiContract: "本模块无 HTTP API",
        envChecklist: passed,
      },
      dependsOn: [],
    },
  ]);
  const titles = pool.tasks.map((t) => t.title);
  assert.match(titles[0], /FDE-03: env probe «Intro»/);
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(impl.dependsOn[0], pool.tasks[0].id);
});

test("no-customer opt-out skips the FDE-03 task", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        envChecklist: "无客户联调环境",
      },
      dependsOn: [],
    },
  ]);
  assert.equal(envChecklistNeedsProbe("无客户联调环境"), false);
  assert.ok(!pool.tasks.some((t) => /FDE-03:/.test(t.title)));
  assert.match(pool.tasks[0].title, /Implement module/);
});
