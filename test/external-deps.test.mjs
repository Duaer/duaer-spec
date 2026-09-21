import test from "node:test";
import assert from "node:assert/strict";
import {
  externalDepsDeclaresNone,
  externalDepsNeedsTask,
  missingExternalDeps,
} from "../web/live-dev/external-deps.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const covered =
  "blocker: vendor API; SLA 2 days; backup mock; parallel path without SSO";

test("missingExternalDeps rejects vague or partial lines", () => {
  assert.ok(missingExternalDeps("第三方稍后定").includes("阻塞项"));
  assert.ok(missingExternalDeps("blocker: vendor API; SLA 2 days").includes("备用 Mock"));
  assert.deepEqual(missingExternalDeps(covered), []);
  assert.deepEqual(missingExternalDeps("本模块无外部依赖"), []);
  assert.equal(externalDepsDeclaresNone("no external dependency"), true);
});

test("task pool injects an FDE-05 board before implement", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Sign in with SSO",
        acceptance: "open the login",
        externalDeps: covered,
      },
      dependsOn: [],
    },
  ]);
  assert.match(pool.tasks[0].title, /FDE-05: external deps «Intro»/);
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(impl.dependsOn[0], pool.tasks[0].id);
});

test("no-dependency opt-out skips the FDE-05 task", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        externalDeps: "本模块无外部依赖",
      },
      dependsOn: [],
    },
  ]);
  assert.equal(externalDepsNeedsTask("本模块无外部依赖"), false);
  assert.ok(!pool.tasks.some((t) => /FDE-05:/.test(t.title)));
  assert.match(pool.tasks[0].title, /Implement module/);
});

test("external deps wait on the data precheck when both are declared", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Import from ERP",
        acceptance: "open the list",
        dataPrecheck:
          "field mapping in mapping.csv; import precheck failure list; export for business cleanup",
        externalDeps: covered,
      },
      dependsOn: [],
    },
  ]);
  const data = pool.tasks.find((t) => /FDE-06:/.test(t.title));
  const ext = pool.tasks.find((t) => /FDE-05:/.test(t.title));
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(ext.dependsOn[0], data.id);
  assert.equal(impl.dependsOn[0], ext.id);
});
