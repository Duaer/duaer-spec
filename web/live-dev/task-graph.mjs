/**
 * Task dependency preview for FDE kickoff — Archify IR (same as architecture).
 */

import {
  splitAcceptanceLines,
  truncateText,
} from "./acceptance-lines.mjs";

const WORKER_TYPES = {
  w1: "backend",
  w2: "frontend",
  w3: "cloud",
  w4: "database",
  w5: "messagebus",
  w6: "security",
  w7: "external",
  w8: "frontend",
};

/**
 * @param {Array<{ id?: string, title?: string, status?: string, card?: object, dependsOn?: string[] }>} modules
 * @returns {{ version: number, tasks: Array<object> }}
 */
export function buildPreviewPoolFromModules(modules) {
  const list = (Array.isArray(modules) ? modules : []).filter(
    (m) => m && m.status === "confirmed",
  );
  const tasks = [];
  const moduleVerifyId = new Map();
  let n = 1;
  const push = (partial) => {
    const id = `T${String(n).padStart(3, "0")}`;
    n += 1;
    const task = {
      id,
      moduleId: partial.moduleId || null,
      title: String(partial.title || "").slice(0, 200),
      dependsOn: Array.isArray(partial.dependsOn)
        ? partial.dependsOn.filter(Boolean)
        : [],
      status: "queued",
      workerId: null,
    };
    tasks.push(task);
    return task;
  };

  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    const title = String(m.title || m.id || "module").slice(0, 80);
    const card = m.card && typeof m.card === "object" ? m.card : {};
    const impl = push({
      moduleId: m.id,
      title: `Implement «${title}»`,
      dependsOn: [],
    });
    const acceptLines = splitAcceptanceLines(card.acceptance);
    let prevId = impl.id;
    if (acceptLines.length) {
      for (const line of acceptLines) {
        const acc = push({
          moduleId: m.id,
          title: `Accept «${title}»: ${truncateText(line, 80)}`,
          dependsOn: [prevId],
        });
        prevId = acc.id;
      }
    } else {
      const acc = push({
        moduleId: m.id,
        title: `Acceptance «${title}»`,
        dependsOn: [impl.id],
      });
      prevId = acc.id;
    }
    const ver = push({
      moduleId: m.id,
      title: `Verify «${title}»`,
      dependsOn: [prevId],
    });
    moduleVerifyId.set(m.id, ver.id);

    const depMods =
      Array.isArray(m.dependsOn) && m.dependsOn.length > 0
        ? m.dependsOn
        : i > 0
          ? [list[i - 1].id]
          : [];
    for (const depMod of depMods) {
      const depVerify = moduleVerifyId.get(depMod);
      if (depVerify && !impl.dependsOn.includes(depVerify)) {
        impl.dependsOn.push(depVerify);
      }
    }
  }

  if (list.length) {
    const verifyAll = push({
      moduleId: null,
      title: "Risk-based verification",
      dependsOn: [...moduleVerifyId.values()],
    });
    const readme = push({
      moduleId: null,
      title: "Update product README",
      dependsOn: [verifyAll.id],
    });
    push({
      moduleId: null,
      title: "Stamp delivery accepted",
      dependsOn: [readme.id],
    });
  }

  return { version: 1, tasks };
}

/**
 * Preview lanes: inherit only within the same module so multi-module pools
 * show parallel colors. Kickoff still uses server assignTasksToWorkers.
 * @param {{ tasks?: Array<object> } | null} pool
 * @param {number} workerCount
 */
export function assignPreviewWorkers(pool, workerCount = 1) {
  const count = Math.max(1, Math.min(8, Number(workerCount) || 1));
  const tasks = (pool?.tasks || []).map((t) => ({ ...t, workerId: null }));
  if (count === 1) {
    for (const t of tasks) t.workerId = "w1";
    return { workerCount: 1, tasks };
  }

  const moduleIds = [
    ...new Set(tasks.map((t) => t.moduleId).filter(Boolean)),
  ];
  const modWorker = new Map();
  moduleIds.forEach((mid, i) => {
    modWorker.set(mid, `w${(i % count) + 1}`);
  });
  for (const t of tasks) {
    t.workerId = t.moduleId ? modWorker.get(t.moduleId) || "w1" : "w1";
  }

  const byId = new Map(
    tasks.map((t) => [String(t.id || "").toUpperCase(), t]),
  );
  for (const t of tasks) {
    const firstDep = Array.isArray(t.dependsOn) ? t.dependsOn[0] : null;
    if (!firstDep) continue;
    const dep = byId.get(String(firstDep).toUpperCase());
    if (
      dep?.workerId &&
      t.moduleId &&
      dep.moduleId &&
      dep.moduleId === t.moduleId
    ) {
      t.workerId = dep.workerId;
    }
  }
  for (const t of tasks) {
    if (!t.moduleId) t.workerId = "w1";
  }
  return { workerCount: count, tasks };
}

function shortTitle(title, max = 36) {
  const t = String(title || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Longest-path ranks so Archify left→right edges stay horizontal.
 * @param {Array<object>} tasks
 * @returns {Map<string, number>}
 */
function dependencyRanks(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const rank = new Map();
  for (const t of list) {
    const id = String(t.id || "");
    if (id) rank.set(id, 0);
  }
  let changed = true;
  let guard = 0;
  while (changed && guard < list.length + 2) {
    changed = false;
    guard += 1;
    for (const t of list) {
      const id = String(t.id || "");
      if (!id) continue;
      let r = 0;
      for (const d of t.dependsOn || []) {
        const dep = String(d || "");
        if (rank.has(dep)) r = Math.max(r, (rank.get(dep) || 0) + 1);
      }
      if ((rank.get(id) || 0) !== r) {
        rank.set(id, r);
        changed = true;
      }
    }
  }
  return rank;
}

/**
 * Drop transitive edges (A→C when A↝B↝C) so Archify can route a clean LTR flow.
 * Execution still uses full dependsOn; this is display-only.
 * @param {Array<{ from: string, to: string }>} edges
 * @returns {Array<{ from: string, to: string }>}
 */
function transitiveReduce(edges) {
  const outs = new Map();
  for (const e of edges) {
    if (!outs.has(e.from)) outs.set(e.from, new Set());
    outs.get(e.from).add(e.to);
  }
  function reaches(from, target, skipDirect) {
    const stack = [...(outs.get(from) || [])].filter((x) => x !== skipDirect);
    const seen = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (id === target) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of outs.get(id) || []) {
        if (!seen.has(n)) stack.push(n);
      }
    }
    return false;
  }
  return edges.filter((e) => !reaches(e.from, e.to, e.to));
}

/**
 * Map assigned tasks → Archify architecture IR (same renderer as system arch).
 * Explicit positions: X = dependency rank, Y = worker lane — same layered look
 * as system architecture; transitive-reduced edges keep Archify routing valid.
 * @param {Array<object>} tasks
 * @param {{ title?: string, workerCount?: number, locale?: string }} [opts]
 */
export function taskPoolToArchitectureIr(tasks, opts = {}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const workerCount = Math.max(1, Number(opts.workerCount) || 1);
  const title = String(opts.title || "Task execution path").slice(0, 120);
  const ranks = dependencyRanks(list);

  const colW = 220;
  const rowH = 130;
  const originX = 48;
  const originY = 96;
  const size = [150, 64];

  const components = [];
  for (const t of list) {
    const id = String(t.id || "");
    if (!id) continue;
    const wid = String(t.workerId || "w1");
    const lane = Math.max(0, Number(String(wid).replace(/^w/i, "")) - 1 || 0);
    const r = ranks.get(id) || 0;
    const type =
      WORKER_TYPES[wid] || (t.moduleId ? "backend" : "security");
    components.push({
      id,
      type,
      label: id,
      sublabel: shortTitle(t.title, 40),
      tag: wid,
      pos: [originX + r * colW, originY + lane * rowH],
      size: [...size],
    });
  }

  const idSet = new Set(components.map((c) => c.id));
  const rawEdges = [];
  for (const t of list) {
    const to = String(t.id || "");
    if (!idSet.has(to)) continue;
    for (const d of t.dependsOn || []) {
      const from = String(d || "");
      if (!idSet.has(from)) continue;
      rawEdges.push({ from, to });
    }
  }
  const connections = transitiveReduce(rawEdges).map((e, i) => ({
    id: `e${i + 1}`,
    from: e.from,
    to: e.to,
    variant: "default",
  }));

  const boundaries = [];
  if (workerCount > 1) {
    for (let i = 1; i <= workerCount; i += 1) {
      const wid = `w${i}`;
      const wraps = list
        .filter((t) => String(t.workerId || "") === wid)
        .map((t) => String(t.id));
      if (wraps.length) {
        boundaries.push({
          kind: "region",
          label: wid,
          wraps,
          pad: 28,
        });
      }
    }
  }

  const maxRank = Math.max(0, ...[...ranks.values(), 0]);
  const maxLane = Math.max(0, workerCount - 1);

  return {
    schema_version: 1,
    diagram_type: "architecture",
    meta: {
      title,
      quality_profile: "standard",
      locale:
        opts.locale === "en" || opts.locale === "ja" ? opts.locale : "zh-CN",
      viewBox: [
        Math.max(320, originX + (maxRank + 1) * colW + 80),
        Math.max(240, originY + (maxLane + 1) * rowH + 160),
      ],
    },
    components,
    connections,
    boundaries,
    cards: [],
  };
}

/**
 * @param {Array<object>} modules
 * @param {number} workerCount
 * @param {{ title?: string, locale?: string }} [opts]
 */
export function buildTaskArchitectureIr(modules, workerCount = 1, opts = {}) {
  const pool = buildPreviewPoolFromModules(modules);
  const assigned = assignPreviewWorkers(pool, workerCount);
  const ir = taskPoolToArchitectureIr(assigned.tasks, {
    title: opts.title,
    workerCount: assigned.workerCount,
    locale: opts.locale,
  });
  return {
    ir,
    tasks: assigned.tasks,
    workerCount: assigned.workerCount,
  };
}
