/**
 * Client-side task dependency graph for FDE kickoff preview.
 * Mirrors bin/live-modules pool + worker assignment closely enough for UI.
 */

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
    const impl = push({
      moduleId: m.id,
      title: `Implement «${title}»`,
      dependsOn: [],
    });
    const acc = push({
      moduleId: m.id,
      title: `Acceptance «${title}»`,
      dependsOn: [impl.id],
    });
    const ver = push({
      moduleId: m.id,
      title: `Verify «${title}»`,
      dependsOn: [acc.id],
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
 * Same rules as bin/live-modules.assignTasksToWorkers.
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
  // Preview lanes: inherit only within the same module so multi-module pools
  // show parallel colors. Kickoff still uses server assignTasksToWorkers.
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

const WORKER_COLORS = {
  w1: "#2f9e8f",
  w2: "#c4a35a",
  w3: "#8b7ec8",
  w4: "#c47a8a",
  w5: "#5a9bc4",
  w6: "#9bc45a",
  w7: "#c48b5a",
  w8: "#5ac4b0",
};

/**
 * Layered DAG layout (longest-path ranks).
 * @param {Array<object>} tasks
 * @returns {{ nodes: Array<object>, edges: Array<object>, width: number, height: number }}
 */
export function layoutTaskGraph(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const byId = new Map(
    list.map((t) => [String(t.id || "").toUpperCase(), t]),
  );
  const ids = list.map((t) => String(t.id || "").toUpperCase()).filter(Boolean);

  const rank = new Map();
  for (const id of ids) rank.set(id, 0);
  let changed = true;
  let guard = 0;
  while (changed && guard < ids.length + 2) {
    changed = false;
    guard += 1;
    for (const t of list) {
      const id = String(t.id || "").toUpperCase();
      if (!id) continue;
      let r = 0;
      for (const d of t.dependsOn || []) {
        const dep = String(d || "").toUpperCase();
        if (rank.has(dep)) r = Math.max(r, (rank.get(dep) || 0) + 1);
      }
      if ((rank.get(id) || 0) !== r) {
        rank.set(id, r);
        changed = true;
      }
    }
  }

  const layers = new Map();
  for (const t of list) {
    const id = String(t.id || "").toUpperCase();
    const r = rank.get(id) || 0;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r).push(t);
  }

  const nodeW = 148;
  const nodeH = 52;
  const gapX = 28;
  const gapY = 36;
  const pad = 24;
  const ranks = [...layers.keys()].sort((a, b) => a - b);
  let maxCols = 1;
  for (const r of ranks) {
    maxCols = Math.max(maxCols, layers.get(r).length);
  }

  const nodes = [];
  for (const r of ranks) {
    const row = layers.get(r);
    row.sort((a, b) =>
      String(a.workerId || "").localeCompare(String(b.workerId || "")),
    );
    const rowWidth = row.length * nodeW + (row.length - 1) * gapX;
    const startX = pad + Math.max(0, (maxCols * nodeW + (maxCols - 1) * gapX - rowWidth) / 2);
    row.forEach((t, i) => {
      const id = String(t.id || "").toUpperCase();
      nodes.push({
        id,
        task: t,
        x: startX + i * (nodeW + gapX),
        y: pad + r * (nodeH + gapY),
        w: nodeW,
        h: nodeH,
        rank: r,
        color: WORKER_COLORS[t.workerId] || WORKER_COLORS.w1,
      });
    });
  }

  const byNode = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  for (const t of list) {
    const to = String(t.id || "").toUpperCase();
    const toNode = byNode.get(to);
    if (!toNode) continue;
    for (const d of t.dependsOn || []) {
      const from = String(d || "").toUpperCase();
      const fromNode = byNode.get(from);
      if (!fromNode || !byId.has(from)) continue;
      edges.push({
        from,
        to,
        x1: fromNode.x + fromNode.w / 2,
        y1: fromNode.y + fromNode.h,
        x2: toNode.x + toNode.w / 2,
        y2: toNode.y,
      });
    }
  }

  const width = pad * 2 + maxCols * nodeW + Math.max(0, maxCols - 1) * gapX;
  const height =
    pad * 2 +
    Math.max(1, ranks.length) * nodeH +
    Math.max(0, ranks.length - 1) * gapY;

  return { nodes, edges, width, height, nodeW, nodeH };
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortTitle(title, max = 28) {
  const t = String(title || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * @param {{ nodes: Array<object>, edges: Array<object>, width: number, height: number }} layout
 * @param {{ workerCount?: number }} [opts]
 * @returns {string} SVG markup
 */
export function renderTaskGraphSvg(layout, opts = {}) {
  const { nodes, edges, width, height } = layout || {
    nodes: [],
    edges: [],
    width: 320,
    height: 120,
  };
  const workerCount = Math.max(1, Number(opts.workerCount) || 1);

  const edgePaths = edges
    .map((e) => {
      const midY = (e.y1 + e.y2) / 2;
      return `<path class="tg-edge" d="M${e.x1} ${e.y1} C${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}" fill="none" />`;
    })
    .join("\n");

  const nodeShapes = nodes
    .map((n) => {
      const title = shortTitle(n.task?.title || n.id);
      const wid = String(n.task?.workerId || "w1");
      return `<g class="tg-node" transform="translate(${n.x},${n.y})">
  <rect width="${n.w}" height="${n.h}" rx="4" ry="4" fill="#0b1118" stroke="${escapeXml(n.color)}" stroke-width="1.5"/>
  <text x="10" y="20" class="tg-id" fill="${escapeXml(n.color)}">${escapeXml(n.id)}</text>
  <text x="10" y="38" class="tg-title" fill="#e8eef7">${escapeXml(title)}</text>
  <text x="${n.w - 8}" y="20" class="tg-worker" text-anchor="end" fill="${escapeXml(n.color)}">${escapeXml(wid)}</text>
</g>`;
    })
    .join("\n");

  const legend =
    workerCount > 1
      ? Array.from({ length: workerCount }, (_, i) => {
          const wid = `w${i + 1}`;
          const color = WORKER_COLORS[wid] || WORKER_COLORS.w1;
          return `<g transform="translate(${24 + i * 56}, ${height - 14})">
  <rect width="10" height="10" rx="2" fill="${color}"/>
  <text x="14" y="9" class="tg-legend" fill="#9aa7b5">${wid}</text>
</g>`;
        }).join("")
      : "";

  const svgH = workerCount > 1 ? height + 8 : height;

  return `<svg class="task-graph-svg" viewBox="0 0 ${width} ${svgH}" width="100%" height="${svgH}" role="img" aria-label="task dependency graph">
  <defs>
    <marker id="tg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#5a6b7d"/>
    </marker>
  </defs>
  <style>
    .tg-edge { stroke: #5a6b7d; stroke-width: 1.25; marker-end: url(#tg-arrow); }
    .tg-id { font: 600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .tg-title { font: 400 10px system-ui, sans-serif; }
    .tg-worker { font: 600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .tg-legend { font: 500 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
  <rect width="100%" height="100%" fill="#020617"/>
  ${edgePaths}
  ${nodeShapes}
  ${legend}
</svg>`;
}

/**
 * @param {Array<object>} modules
 * @param {number} workerCount
 */
export function buildTaskGraphSvg(modules, workerCount = 1) {
  const pool = buildPreviewPoolFromModules(modules);
  const assigned = assignPreviewWorkers(pool, workerCount);
  const layout = layoutTaskGraph(assigned.tasks);
  return {
    svg: renderTaskGraphSvg(layout, { workerCount: assigned.workerCount }),
    tasks: assigned.tasks,
    workerCount: assigned.workerCount,
    layout,
  };
}
