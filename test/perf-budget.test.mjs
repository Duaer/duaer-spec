import test from "node:test";
import assert from "node:assert/strict";
import {
  missingPerfBudget,
  perfBudgetDeclaresNone,
  perfBudgetNeedsTask,
} from "../web/live-dev/perf-budget.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const covered =
  "LCP 2.5s; INP 200ms; bundle under 200kb; virtual scroll for long lists; weak network 3G; large data load test";

test("missingPerfBudget rejects vague or partial speed lines", () => {
  assert.ok(missingPerfBudget("挺快的").includes("LCP"));
  assert.ok(missingPerfBudget("LCP 2.5s; INP 200ms").includes("弱网"));
  assert.deepEqual(missingPerfBudget(covered), []);
  assert.deepEqual(missingPerfBudget("本模块无页面性能要求"), []);
  assert.equal(perfBudgetDeclaresNone("no page performance"), true);
});

test("task pool injects an FDE-08 budget before implement", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Show a long order list",
        acceptance: "open the list",
        perfBudget: covered,
      },
      dependsOn: [],
    },
  ]);
  assert.match(pool.tasks[0].title, /FDE-08: perf budget «Intro»/);
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(impl.dependsOn[0], pool.tasks[0].id);
});

test("no-page-performance opt-out skips the FDE-08 task", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        perfBudget: "本模块无页面性能要求",
      },
      dependsOn: [],
    },
  ]);
  assert.equal(perfBudgetNeedsTask("本模块无页面性能要求"), false);
  assert.ok(!pool.tasks.some((t) => /FDE-08:/.test(t.title)));
  assert.match(pool.tasks[0].title, /Implement module/);
});

test("perf budget waits on the external-deps task when both are declared", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Show a long order list",
        acceptance: "open the list",
        externalDeps:
          "blocker: vendor API; SLA 2 days; backup mock; parallel path without SSO",
        perfBudget: covered,
      },
      dependsOn: [],
    },
  ]);
  const ext = pool.tasks.find((t) => /FDE-05:/.test(t.title));
  const perf = pool.tasks.find((t) => /FDE-08:/.test(t.title));
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(perf.dependsOn[0], ext.id);
  assert.equal(impl.dependsOn[0], perf.id);
});
