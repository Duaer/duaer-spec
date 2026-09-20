/**
 * Modular requirements helpers + task pool.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  clipModules,
  modulesAllConfirmed,
  confirmModuleInList,
  aggregateModulesCard,
  buildTaskPoolFromModules,
  buildBugTaskPool,
  taskPoolToMarkdown,
  assignTasksToWorkers,
  mergeModulesFromChat,
} from "../bin/live-modules.mjs";
import {
  readProjectChat,
  writeProjectChat,
} from "../bin/live-project-chat.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("clipModules migrates legacy singular card to main", () => {
  const mods = clipModules(null, {
    goal: "Ship login page with email",
    outOfScope: "SSO",
    acceptance: "Open /login and see form",
    assumptions: "Email auth",
  });
  assert.equal(mods.length, 1);
  assert.equal(mods[0].id, "main");
  assert.equal(mods[0].card.goal, "Ship login page with email");
});

test("confirmModuleInList and modulesAllConfirmed", () => {
  let mods = [
    {
      id: "auth",
      title: "Auth",
      status: "draft",
      card: {
        goal: "Login with email password",
        outOfScope: "",
        acceptance: "Open /login see form submit works",
        assumptions: "",
      },
      dependsOn: [],
    },
    {
      id: "billing",
      title: "Billing",
      status: "draft",
      card: {
        goal: "Show invoices list",
        outOfScope: "",
        acceptance: "Open /invoices see table",
        assumptions: "",
      },
      dependsOn: ["auth"],
    },
  ];
  assert.equal(modulesAllConfirmed(mods), false);
  mods = confirmModuleInList(mods, "auth", mods[0].card);
  assert.equal(mods[0].status, "confirmed");
  assert.equal(modulesAllConfirmed(mods), false);
  mods = confirmModuleInList(mods, "billing", mods[1].card);
  assert.equal(modulesAllConfirmed(mods), true);
});

test("aggregateModulesCard joins multi-module brief", () => {
  const agg = aggregateModulesCard([
    {
      id: "a",
      title: "A",
      status: "confirmed",
      card: {
        goal: "Do A thing here",
        outOfScope: "X",
        acceptance: "Open /a see ok",
        assumptions: "",
      },
      dependsOn: [],
    },
    {
      id: "b",
      title: "B",
      status: "confirmed",
      card: {
        goal: "Do B thing here",
        outOfScope: "",
        acceptance: "Open /b see ok",
        assumptions: "Y",
      },
      dependsOn: [],
    },
  ]);
  assert.match(agg.goal, /\[A\]/);
  assert.match(agg.goal, /\[B\]/);
  assert.match(agg.acceptance, /\/a/);
});

test("buildTaskPoolFromModules splits multi-line acceptance into atomic tasks", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "auth",
      title: "Auth",
      status: "confirmed",
      card: {
        goal: "Login",
        outOfScope: "",
        acceptance: "- Open /login see form\n- Submit shows dashboard",
        assumptions: "",
      },
      dependsOn: [],
    },
  ]);
  const acceptTasks = pool.tasks.filter((t) =>
    /Satisfy acceptance \(alone\)/.test(t.title),
  );
  assert.equal(acceptTasks.length, 2);
  assert.match(acceptTasks[0].title, /Open \/login/);
  assert.match(acceptTasks[1].title, /Submit shows/);
  assert.deepEqual(acceptTasks[0].dependsOn, ["T001"]);
  assert.deepEqual(acceptTasks[1].dependsOn, [acceptTasks[0].id]);
  const md = taskPoolToMarkdown(pool);
  assert.match(md, /原子任务规则/);
  assert.match(md, /进度必须可监控/);
  const boxes = md.match(/^- \[ \]/gm) || [];
  assert.ok(boxes.length >= 5);
});

test("buildTaskPoolFromModules has dependsOn chain", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "auth",
      title: "Auth",
      status: "confirmed",
      card: {
        goal: "Login flow ready",
        outOfScope: "",
        acceptance: "Open /login see form",
        assumptions: "",
      },
      dependsOn: [],
    },
    {
      id: "dash",
      title: "Dash",
      status: "confirmed",
      card: {
        goal: "Dashboard home",
        outOfScope: "",
        acceptance: "Open / see cards",
        assumptions: "",
      },
      dependsOn: [],
    },
  ]);
  assert.ok(pool.tasks.length >= 6);
  const md = taskPoolToMarkdown(pool);
  assert.match(md, /depends:/);
  assert.match(md, /Update product README/);
  const assigned = assignTasksToWorkers(pool, 2);
  assert.equal(assigned.workerCount, 2);
  // Default pool chains module N → N-1 verify; inherit pulls dependents onto
  // the dependency's worker (reliable same-lane), so often one lane owns all.
  const byId = Object.fromEntries(assigned.tasks.map((t) => [t.id, t]));
  const authImpl = assigned.tasks.find(
    (t) => /Auth/.test(t.title) && t.dependsOn.length === 0,
  );
  const authAccept = assigned.tasks.find(
    (t) => t.dependsOn?.[0] === authImpl?.id,
  );
  assert.ok(authImpl && authAccept);
  assert.equal(authAccept.workerId, authImpl.workerId);
  const authVerify = assigned.tasks.find(
    (t) => /Verify/.test(t.title) && /Auth/.test(t.title),
  );
  const dashImpl = assigned.tasks.find(
    (t) => /Dash/.test(t.title) && /Implement/.test(t.title),
  );
  assert.ok(authVerify && dashImpl);
  assert.ok(dashImpl.dependsOn.includes(authVerify.id));
  // verify-l3 tasks use the last lane when N≥2
  assert.equal(authVerify.role, "verify-l3");
  assert.equal(authVerify.workerId, "w2");
  const sharedImpl = assigned.tasks.filter(
    (t) => !t.moduleId && t.role === "implement",
  );
  const sharedVerify = assigned.tasks.filter(
    (t) => !t.moduleId && t.role === "verify-l3",
  );
  assert.ok(sharedImpl.length > 0);
  assert.ok(sharedImpl.every((t) => t.workerId === "w1"));
  assert.ok(sharedVerify.every((t) => t.workerId === "w2"));
});

test("assignTasksToWorkers keeps independent modules on separate workers", () => {
  const pool = {
    tasks: [
      { id: "T001", moduleId: "a", title: "A1", dependsOn: [] },
      { id: "T002", moduleId: "a", title: "A2", dependsOn: ["T001"] },
      { id: "T003", moduleId: "b", title: "B1", dependsOn: [] },
      { id: "T004", moduleId: "b", title: "B2", dependsOn: ["T003"] },
      { id: "T005", moduleId: null, title: "shared", dependsOn: ["T002", "T004"] },
    ],
  };
  const assigned = assignTasksToWorkers(pool, 2);
  const byId = Object.fromEntries(assigned.tasks.map((t) => [t.id, t]));
  assert.equal(byId.T001.workerId, "w1");
  assert.equal(byId.T002.workerId, "w1");
  assert.equal(byId.T003.workerId, "w2");
  assert.equal(byId.T004.workerId, "w2");
  assert.equal(byId.T005.workerId, "w1");
});

test("mergeModulesFromChat preserves confirmed cards", () => {
  const existing = [
    {
      id: "auth",
      title: "Auth",
      status: "confirmed",
      card: {
        goal: "Locked goal text here",
        outOfScope: "",
        acceptance: "Open /login see form",
        assumptions: "",
      },
      dependsOn: [],
    },
  ];
  const { modules, activeModuleId } = mergeModulesFromChat(
    existing,
    [
      {
        id: "auth",
        title: "Auth",
        status: "draft",
        goal: "Should not overwrite",
        acceptance: "Should not overwrite",
      },
      {
        id: "billing",
        title: "Billing",
        status: "draft",
        goal: "Invoice list page",
        acceptance: "Open /invoices see rows",
      },
    ],
    "billing",
    { goal: "Invoice list page", acceptance: "Open /invoices see rows" },
  );
  assert.equal(modules.length, 2);
  assert.equal(modules.find((m) => m.id === "auth").status, "confirmed");
  assert.equal(
    modules.find((m) => m.id === "auth").card.goal,
    "Locked goal text here",
  );
  assert.equal(activeModuleId, "billing");
});

test("project chat persists modules and workerCount", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-mod-"));
  const projectPath = path.join(root, "app");
  writeProjectChat(root, {
    projectPath,
    messages: [],
    modules: [
      {
        id: "auth",
        title: "Auth",
        status: "confirmed",
        card: {
          goal: "Login with email password",
          outOfScope: "",
          acceptance: "Open /login see form",
          assumptions: "",
        },
        dependsOn: [],
      },
    ],
    activeModuleId: "auth",
    workerCount: 2,
    locked: true,
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.modules.length, 1);
  assert.equal(loaded.modules[0].id, "auth");
  assert.equal(loaded.activeModuleId, "auth");
  assert.equal(loaded.workerCount, 2);
  assert.equal(loaded.locked, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test("live sources wire modular confirm and late kickoff", () => {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /modulesAllConfirmed/);
  assert.match(live, /needArchitecture/);
  assert.match(live, /writeBrief: false/);
  assert.match(live, /buildTaskPoolFromModules/);
  assert.match(live, /workerCount/);
  assert.match(live, /task-pool\.json/);
  assert.match(live, /Update product README|更新产品仓 README/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /modulesAllConfirmedLocal|renderModuleTabs/);
  assert.match(js, /modulesAllConfirmed/);
  assert.match(js, /workerCount/);
  assert.match(js, /taskPoolPreview/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /moduleTabs/);
  assert.match(html, /workerCount/);
});

test("buildBugTaskPool is reproduce → fix → regress (not modular implement)", () => {
  const pool = buildBugTaskPool([
    {
      id: "bug",
      title: "缺陷",
      status: "confirmed",
      card: {
        goal: "Login button does nothing on Safari",
        outOfScope: "New SSO",
        acceptance: "Repro closed; click Login opens /home",
        assumptions: "Safari 17",
      },
      dependsOn: [],
    },
  ]);
  assert.equal(pool.kind, "bug");
  assert.ok(pool.tasks.length >= 5);
  assert.match(pool.tasks[0].title, /Reproduce/);
  assert.match(pool.tasks[1].title, /Fix/);
  assert.ok(pool.tasks.some((t) => /Regression|regression/i.test(t.title)));
  assert.ok(!pool.tasks.some((t) => /Implement module/i.test(t.title)));
});

test("project chat persists deskKind bug", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-bug-kind-"));
  const projectPath = path.join(root, "app");
  fs.mkdirSync(projectPath);
  writeProjectChat(root, {
    projectPath,
    deskKind: "bug",
    bugHotfix: true,
    modules: [
      {
        id: "bug",
        title: "缺陷",
        status: "draft",
        card: {
          goal: "Crash on save",
          outOfScope: "",
          acceptance: "Save succeeds without crash",
          assumptions: "",
        },
        dependsOn: [],
      },
    ],
    activeModuleId: "bug",
  });
  const loaded = readProjectChat(root, projectPath);
  assert.equal(loaded.deskKind, "bug");
  assert.equal(loaded.bugHotfix, true);
  fs.rmSync(root, { recursive: true, force: true });
});
