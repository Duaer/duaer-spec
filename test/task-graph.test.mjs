import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assignPreviewWorkers,
  buildPreviewPoolFromModules,
  buildTaskGraphSvg,
  layoutTaskGraph,
} from "../web/live-dev/task-graph.mjs";

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

test("layoutTaskGraph layers by dependsOn", () => {
  const pool = buildPreviewPoolFromModules(modules);
  const assigned = assignPreviewWorkers(pool, 2);
  const layout = layoutTaskGraph(assigned.tasks);
  assert.ok(layout.nodes.length === assigned.tasks.length);
  assert.ok(layout.edges.length > 0);
  const ranks = layout.nodes.map((n) => n.rank);
  assert.ok(Math.max(...ranks) > 0);
});

test("buildTaskGraphSvg returns one svg with nodes", () => {
  const { svg, tasks } = buildTaskGraphSvg(modules, 2);
  assert.match(svg, /<svg class="task-graph-svg"/);
  assert.match(svg, /T001/);
  assert.ok(tasks.length > 0);
  assert.doesNotMatch(svg, /<script/i);
});

test("live sources wire worker chips and task graph", () => {
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(html, /id="workerCountList"/);
  assert.match(html, /id="taskGraphMount"/);
  assert.doesNotMatch(html, /id="workerCount"/);
  assert.match(app, /renderWorkerCountList|buildTaskGraphSvg/);
  assert.match(css, /\.worker-count-chip|\.task-graph-mount/);
});
