import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  annotateParallelTasks,
  assignPreviewWorkers,
  buildPreviewPoolFromModules,
  buildTaskArchitectureIr,
  recommendWorkerCount,
  taskPoolToArchitectureIr,
} from "../web/live-dev/task-graph.mjs";
import { sanitizeArchitectureIr } from "../bin/live-archify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const modules = [
  {
    id: "auth",
    title: "Auth",
    status: "confirmed",
    card: { goal: "login", acceptance: "ok", outOfScope: "", assumptions: "" },
    dependsOn: [],
  },
  {
    id: "dash",
    title: "Dash",
    status: "confirmed",
    card: { goal: "home", acceptance: "ok", outOfScope: "", assumptions: "" },
    dependsOn: [],
  },
];

test("annotateParallelTasks marks same-wave tasks", () => {
  const tasks = [
    { id: "T001", title: "A", dependsOn: [] },
    { id: "T002", title: "B", dependsOn: [] },
    { id: "T003", title: "C", dependsOn: ["T001"] },
  ];
  const annotated = annotateParallelTasks(tasks);
  assert.equal(annotated[0].parallel, true);
  assert.equal(annotated[1].parallel, true);
  assert.equal(annotated[2].parallel, false);
  assert.equal(annotated[0].wave, 0);
  assert.equal(annotated[2].wave, 1);
});

test("recommendWorkerCount uses parallel width and specialty bump", () => {
  const parallel = [
    { id: "T001", title: "A", dependsOn: [], role: "implement" },
    { id: "T002", title: "B", dependsOn: [], role: "implement" },
  ];
  assert.equal(recommendWorkerCount(parallel, { max: 4 }), 2);
  const withSpecialty = [
    ...parallel,
    { id: "T003", title: "V", dependsOn: ["T001", "T002"], role: "verify-l3" },
  ];
  assert.equal(recommendWorkerCount(withSpecialty, { max: 4 }), 3);
  const serial = [
    { id: "T001", title: "A", dependsOn: [] },
    { id: "T002", title: "B", dependsOn: ["T001"] },
  ];
  assert.equal(recommendWorkerCount(serial, { max: 4 }), 1);
});

test("buildPreviewPoolFromModules creates dependsOn chain", () => {
  const pool = buildPreviewPoolFromModules(modules);
  assert.ok(pool.tasks.length >= 6);
  const byId = Object.fromEntries(pool.tasks.map((t) => [t.id, t]));
  assert.deepEqual(byId.T002.dependsOn, ["T001"]);
  assert.ok(byId.T004.dependsOn.includes("T003"));
});

test("buildPreviewPoolFromModules splits multi-line acceptance", () => {
  const pool = buildPreviewPoolFromModules([
    {
      id: "auth",
      title: "Auth",
      status: "confirmed",
      card: {
        goal: "login",
        acceptance: "- form shown\n- submit works",
        outOfScope: "",
        assumptions: "",
      },
      dependsOn: [],
    },
  ]);
  const acceptTasks = pool.tasks.filter((t) => /^Accept «/.test(t.title));
  assert.equal(acceptTasks.length, 2);
  assert.match(acceptTasks[0].title, /form shown/);
  assert.match(acceptTasks[1].title, /submit works/);
});

test("assignPreviewWorkers fans modules across workers", () => {
  const pool = buildPreviewPoolFromModules(modules);
  const one = assignPreviewWorkers(pool, 1);
  assert.ok(one.tasks.every((t) => t.workerId === "w1"));
  const two = assignPreviewWorkers(pool, 2);
  const modWorkers = new Set(
    two.tasks.filter((t) => t.moduleId).map((t) => t.workerId),
  );
  assert.ok(modWorkers.size >= 2);
});

test("taskPoolToArchitectureIr keeps Archify edge clearance", () => {
  const pool = buildPreviewPoolFromModules(modules);
  const assigned = assignPreviewWorkers(pool, 1);
  const ir = taskPoolToArchitectureIr(assigned.tasks, {
    title: "任务执行路径",
    workerCount: 1,
  });
  const byId = Object.fromEntries(ir.components.map((c) => [c.id, c]));
  // Consecutive ranks must leave ≥24px after Archify widens boxes to 200px.
  const a = byId.T001;
  const b = byId.T002;
  assert.ok(a && b);
  const gap = b.pos[0] - a.pos[0];
  assert.ok(gap >= 224, `col spacing ${gap} must be >= 224 (200+24)`);
});

test("taskPoolToArchitectureIr is Archify-sanitizable", () => {
  const { ir, tasks } = buildTaskArchitectureIr(modules, 2, {
    title: "任务执行路径",
  });
  assert.ok(tasks.length > 0);
  assert.equal(ir.diagram_type, "architecture");
  assert.ok(ir.components.length >= tasks.length);
  assert.ok(ir.connections.length > 0);
  const clean = sanitizeArchitectureIr(ir);
  assert.ok(clean);
  assert.ok(clean.components.length > 0);
  assert.ok(clean.connections.length > 0);
});

test("taskPoolToArchitectureIr maps dependsOn to connections", () => {
  const ir = taskPoolToArchitectureIr(
    [
      { id: "T001", title: "A", dependsOn: [], workerId: "w1" },
      { id: "T002", title: "B", dependsOn: ["T001"], workerId: "w1" },
    ],
    { workerCount: 1, title: "Test" },
  );
  assert.equal(ir.connections[0].from, "T001");
  assert.equal(ir.connections[0].to, "T002");
});

test("taskPoolToArchitectureIr drops transitive edges for Archify routing", () => {
  const ir = taskPoolToArchitectureIr(
    [
      { id: "T001", title: "A", dependsOn: [], workerId: "w1" },
      { id: "T002", title: "B", dependsOn: ["T001"], workerId: "w1" },
      { id: "T003", title: "C", dependsOn: ["T001", "T002"], workerId: "w1" },
    ],
    { workerCount: 1, title: "Test" },
  );
  const pairs = ir.connections.map((c) => `${c.from}->${c.to}`);
  assert.deepEqual(pairs, ["T001->T002", "T002->T003"]);
  assert.ok(ir.components.every((c) => Array.isArray(c.pos)));
});

test("taskPoolToArchitectureIr lanes workers on Y axis", () => {
  const ir = taskPoolToArchitectureIr(
    [
      { id: "T001", title: "A", dependsOn: [], workerId: "w1" },
      { id: "T002", title: "B", dependsOn: [], workerId: "w2" },
    ],
    { workerCount: 2, title: "Test" },
  );
  const a = ir.components.find((c) => c.id === "T001");
  const b = ir.components.find((c) => c.id === "T002");
  assert.equal(a.pos[0], b.pos[0]);
  assert.ok(b.pos[1] > a.pos[1]);
  assert.equal(ir.boundaries.length, 2);
});

test("taskPoolToArchitectureIr has no edge labels or legend cards", () => {
  const ir = taskPoolToArchitectureIr(
    [
      { id: "T001", title: "A", dependsOn: [], workerId: "w1" },
      { id: "T002", title: "B", dependsOn: ["T001"], workerId: "w1" },
    ],
    { workerCount: 1, title: "Test" },
  );
  assert.equal(ir.cards.length, 0);
  assert.equal(ir.meta.subtitle, undefined);
  assert.ok(ir.connections.every((c) => !c.label));
});

test("live sources wire Archify task graph mount", () => {
  const html = fs.readFileSync(
    path.join(ROOT, "web/live-dev/dispatch-center.html"),
    "utf8",
  );
  const page = fs.readFileSync(
    path.join(ROOT, "web/live-dev/dispatch-center.js"),
    "utf8",
  );
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(html, /id="taskGraphMount"/);
  assert.match(html, /architecture-mount/);
  assert.match(page, /buildTaskArchitectureIr|\/api\/architecture\/render/);
  assert.match(page, /mountArchitectureDiagram\(mount/);
  assert.match(app, /window\.open\(`\/dispatch-center\.html/);
  assert.doesNotMatch(app, /buildTaskGraphSvg|innerHTML = graph\.svg/);
  assert.doesNotMatch(page, /buildTaskGraphSvg|innerHTML = graph\.svg/);
});

test("desk wires decompose → recommend workers → graph confirm", () => {
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(html, /id="taskDecomposeField"/);
  assert.match(html, /id="confirmWorkersGraph"/);
  assert.match(html, /id="redecomposeTasks"/);
  assert.match(js, /decomposeTasksFromModules/);
  assert.match(js, /confirmWorkersAndBuildGraph/);
  assert.match(js, /dispatchGraphReady/);
  assert.match(js, /setConfirmWorkersGraphBusy/);
  assert.match(js, /dispatch\.graphBuilding/);
  assert.match(js, /\/api\/architecture\/render/);
  assert.match(js, /recommendWorkerCount/);
  assert.match(css, /duaer-btn-spin|is-busy/);
  assert.match(js, /annotateParallelTasks/);
});
