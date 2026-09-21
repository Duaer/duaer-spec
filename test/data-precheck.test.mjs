import test from "node:test";
import assert from "node:assert/strict";
import {
  dataPrecheckDeclaresNoImport,
  dataPrecheckNeedsTask,
  missingDataPrecheck,
} from "../web/live-dev/data-precheck.mjs";
import { buildTaskPoolFromModules } from "../bin/live-modules.mjs";

const covered =
  "field mapping in mapping.csv; import precheck failure list; export for business cleanup";

test("missingDataPrecheck rejects vague or partial lines", () => {
  assert.ok(missingDataPrecheck("数据正常").includes("字段映射"));
  assert.ok(missingDataPrecheck("字段映射见 mapping.csv").includes("可导出"));
  assert.deepEqual(missingDataPrecheck(covered), []);
  assert.deepEqual(missingDataPrecheck("本模块无导入"), []);
  assert.equal(dataPrecheckDeclaresNoImport("no import"), true);
});

test("task pool injects an FDE-06 precheck before implement", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Import orders",
        acceptance: "open the list",
        dataPrecheck: covered,
      },
      dependsOn: [],
    },
  ]);
  assert.match(pool.tasks[0].title, /FDE-06: data precheck «Intro»/);
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(impl.dependsOn[0], pool.tasks[0].id);
});

test("no-import opt-out skips the FDE-06 task", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Share a page",
        acceptance: "open the link",
        dataPrecheck: "本模块无导入",
      },
      dependsOn: [],
    },
  ]);
  assert.equal(dataPrecheckNeedsTask("本模块无导入"), false);
  assert.ok(!pool.tasks.some((t) => /FDE-06:/.test(t.title)));
  assert.match(pool.tasks[0].title, /Implement module/);
});

test("data precheck waits on the env probe when both are declared", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Intro",
      status: "confirmed",
      card: {
        goal: "Import orders",
        acceptance: "open the list",
        envChecklist: "DNS pass; TLS pass; CORS pass; auth pass; third-party reachable",
        dataPrecheck: covered,
      },
      dependsOn: [],
    },
  ]);
  const env = pool.tasks.find((t) => /FDE-03:/.test(t.title));
  const data = pool.tasks.find((t) => /FDE-06:/.test(t.title));
  const impl = pool.tasks.find((t) => /Implement module/.test(t.title));
  assert.equal(data.dependsOn[0], env.id);
  assert.equal(impl.dependsOn[0], data.id);
});
