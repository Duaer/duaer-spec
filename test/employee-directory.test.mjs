/**
 * Employee directory + task roles.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EMPLOYEE_CATALOG,
  EMPLOYEE_ROLES,
  rolePromptZh,
} from "../web/live-dev/employee-catalog.mjs";
import {
  assignTasksToWorkers,
  buildTaskPoolFromModules,
  taskPoolToMarkdown,
} from "../bin/live-modules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("catalog has implementer and regression", () => {
  assert.equal(EMPLOYEE_CATALOG.length, 2);
  assert.ok(EMPLOYEE_CATALOG.some((e) => e.role === EMPLOYEE_ROLES.IMPLEMENT));
  assert.ok(EMPLOYEE_CATALOG.some((e) => e.role === EMPLOYEE_ROLES.VERIFY_L3));
});

test("buildTaskPoolFromModules tags implement vs verify-l3 roles", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "auth",
      title: "Auth",
      status: "confirmed",
      card: {
        goal: "Login",
        acceptance: "Open /login",
        outOfScope: "",
        assumptions: "",
      },
      dependsOn: [],
    },
  ]);
  const byRole = pool.tasks.reduce((acc, t) => {
    (acc[t.role] ||= []).push(t);
    return acc;
  }, {});
  assert.ok((byRole[EMPLOYEE_ROLES.IMPLEMENT] || []).length >= 1);
  assert.ok((byRole[EMPLOYEE_ROLES.VERIFY_L3] || []).length >= 1);
  const md = taskPoolToMarkdown(pool);
  assert.match(md, /\{verify-l3\}/);
  assert.match(md, /\{implement\}/);
});

test("assignTasksToWorkers sends verify-l3 to last lane when N≥2", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "a",
      title: "A",
      status: "confirmed",
      card: { goal: "g", acceptance: "ok", outOfScope: "", assumptions: "" },
      dependsOn: [],
    },
    {
      id: "b",
      title: "B",
      status: "confirmed",
      card: { goal: "g", acceptance: "ok", outOfScope: "", assumptions: "" },
      dependsOn: [],
    },
  ]);
  const assigned = assignTasksToWorkers(pool, 2);
  const verify = assigned.tasks.filter((t) => t.role === EMPLOYEE_ROLES.VERIFY_L3);
  assert.ok(verify.length >= 1);
  assert.ok(verify.every((t) => t.workerId === "w2"));
});

test("rolePromptZh mentions regression duties", () => {
  const s = rolePromptZh([EMPLOYEE_ROLES.VERIFY_L3]);
  assert.match(s, /功能回归|verify-l3|Playwright|testing\.md/);
});

test("desk wires employee directory toggle and drawer", () => {
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(html, /id="employeeToggle"/);
  assert.match(html, /id="employeePanel"/);
  assert.match(app, /setEmployeeOpen/);
  assert.match(app, /EMPLOYEE_CATALOG/);
  assert.match(i18n, /employee\.regression\.name/);
  assert.match(i18n, /employee\.implementer\.name/);
});
