import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assignPreviewWorkers,
  buildPreviewPoolFromModules,
  buildTaskArchitectureIr,
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

test("buildPreviewPoolFromModules creates dependsOn chain", () => {
  const pool = buildPreviewPoolFromModules(modules);
  assert.ok(pool.tasks.length >= 6);
  const byId = Object.fromEntries(pool.tasks.map((t) => [t.id, t]));
  assert.deepEqual(byId.T002.dependsOn, ["T001"]);
  assert.ok(byId.T004.dependsOn.includes("T003"));
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

test("live sources wire Archify task graph mount", () => {
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(html, /id="taskGraphMount"/);
  assert.match(html, /architecture-mount/);
  assert.match(app, /buildTaskArchitectureIr|\/api\/architecture\/render/);
  assert.match(app, /mountArchitectureDiagram\(el\.taskGraphMount/);
  assert.doesNotMatch(app, /buildTaskGraphSvg|innerHTML = graph\.svg/);
});
