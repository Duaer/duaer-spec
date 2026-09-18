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
  const assigned = assignTasksToWorkers(pool, 2);
  assert.equal(assigned.workerCount, 2);
  const workers = new Set(assigned.tasks.map((t) => t.workerId));
  assert.ok(workers.has("w1"));
  assert.ok(workers.has("w2"));
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
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /modulesAllConfirmedLocal|renderModuleTabs/);
  assert.match(js, /modulesAllConfirmed/);
  assert.match(js, /workerCount/);
  assert.match(js, /taskPoolPreview/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /moduleTabs/);
  assert.match(html, /workerCount/);
});
