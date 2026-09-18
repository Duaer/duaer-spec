/**
 * Bootstrap Archify (MIT, tt-a1i/archify) and render architecture JSON IR
 * to self-contained HTML under ~/.duaer/live/architecture/.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ARCHIFY_REPO = "https://github.com/tt-a1i/archify.git";
const COMPONENT_TYPES = new Set([
  "frontend",
  "backend",
  "database",
  "cloud",
  "security",
  "messagebus",
  "external",
]);

const CONNECTION_VARIANTS = new Set([
  "default",
  "emphasis",
  "security",
  "dashed",
]);
const BOUNDARY_KINDS = new Set(["region", "security-group"]);
const CARD_DOTS = new Set([
  "cyan",
  "emerald",
  "violet",
  "amber",
  "rose",
  "orange",
  "slate",
]);
const META_KEYS = new Set([
  "title",
  "locale",
  "subtitle",
  "output",
  "animation",
  "visual_preset",
  "quality_profile",
  "engineering_profile",
  "repository",
  "views",
  "legend",
  "viewBox",
]);
const COMPONENT_KEYS = new Set([
  "id",
  "type",
  "label",
  "sublabel",
  "tag",
  "brand",
  "sources",
  "row",
  "col",
  "pos",
  "size",
]);
const CONNECTION_KEYS = new Set([
  "id",
  "from",
  "to",
  "label",
  "variant",
  "fromSide",
  "toSide",
  "route",
  "via",
  "labelAt",
  "labelDx",
  "labelDy",
  "labelSegment",
  "width",
]);
const BOUNDARY_KEYS = new Set(["kind", "label", "wraps", "pad"]);
const CARD_KEYS = new Set(["dot", "title", "items"]);

function pickKeys(obj, allowed) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

/**
 * Drop chat/Brief fields (ready, goal, reply, …) so Archify schema validation
 * (additionalProperties: false) accepts the IR.
 */
export function sanitizeArchitectureIr(raw) {
  if (!raw || typeof raw !== "object") return null;
  const src =
    raw.diagram_type === "architecture" || Array.isArray(raw.components)
      ? raw
      : null;
  if (!src || !Array.isArray(src.components)) return null;

  const metaIn =
    src.meta && typeof src.meta === "object" ? src.meta : {};
  const meta = pickKeys(metaIn, META_KEYS);
  if (!meta.title) {
    meta.title =
      (typeof src.title === "string" && src.title.trim()) || "Architecture";
  }
  if (!meta.quality_profile) meta.quality_profile = "standard";

  const components = src.components
    .filter((c) => c && typeof c === "object")
    .map((c) => pickKeys(c, COMPONENT_KEYS))
    .filter((c) => c.id && c.type && c.label && COMPONENT_TYPES.has(c.type));

  const connections = (Array.isArray(src.connections) ? src.connections : [])
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const row = pickKeys(e, CONNECTION_KEYS);
      if (row.variant && !CONNECTION_VARIANTS.has(row.variant)) {
        delete row.variant;
      }
      return row;
    })
    .filter((e) => e.from && e.to);

  const boundaries = (Array.isArray(src.boundaries) ? src.boundaries : [])
    .filter((b) => b && typeof b === "object")
    .map((b) => pickKeys(b, BOUNDARY_KEYS))
    .filter(
      (b) =>
        BOUNDARY_KINDS.has(b.kind) &&
        b.label &&
        Array.isArray(b.wraps) &&
        b.wraps.length,
    );

  const cards = (Array.isArray(src.cards) ? src.cards : [])
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const row = pickKeys(c, CARD_KEYS);
      if (!CARD_DOTS.has(row.dot)) row.dot = "cyan";
      if (!Array.isArray(row.items)) row.items = [];
      return row;
    })
    .filter((c) => c.title);

  const out = {
    schema_version: 1,
    diagram_type: "architecture",
    meta,
    components,
    connections,
    boundaries,
    cards,
  };
  if (src.layout && typeof src.layout === "object" && src.layout.mode === "grid") {
    out.layout = {
      mode: "grid",
      ...pickKeys(src.layout, [
        "origin",
        "cols",
        "gapX",
        "gapY",
        "cellW",
        "cellH",
      ]),
    };
  }
  return out;
}

export function archifyHome() {
  return path.join(os.homedir(), ".duaer", "tools", "archify");
}

export function archifyBin() {
  return path.join(archifyHome(), "archify", "bin", "archify.mjs");
}

export function architectureStoreDir(liveRoot) {
  return path.join(liveRoot, "architecture");
}

/**
 * Clone / update Archify skill tree and install its deps (once).
 * @returns {{ ok: boolean, home: string, error?: string }}
 */
export function ensureArchifyInstalled() {
  const home = archifyHome();
  const skill = path.join(home, "archify");
  const bin = archifyBin();
  try {
    fs.mkdirSync(path.dirname(home), { recursive: true });
    if (!fs.existsSync(bin)) {
      if (fs.existsSync(home)) {
        fs.rmSync(home, { recursive: true, force: true });
      }
      const clone = spawnSync(
        "git",
        ["clone", "--depth", "1", ARCHIFY_REPO, home],
        { encoding: "utf8", timeout: 180000 },
      );
      if (clone.status !== 0) {
        return {
          ok: false,
          home,
          error: clone.stderr || clone.stdout || "git clone failed",
        };
      }
    }
    if (!fs.existsSync(path.join(skill, "node_modules"))) {
      const npm = spawnSync("npm", ["install"], {
        cwd: skill,
        encoding: "utf8",
        timeout: 180000,
      });
      if (npm.status !== 0) {
        return {
          ok: false,
          home,
          error: npm.stderr || npm.stdout || "npm install failed",
        };
      }
    }
    if (!fs.existsSync(bin)) {
      return { ok: false, home, error: "archify.mjs missing after install" };
    }
    return { ok: true, home };
  } catch (err) {
    return {
      ok: false,
      home,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function hasFinitePos(c) {
  return (
    Array.isArray(c.pos) &&
    c.pos.length === 2 &&
    Number.isFinite(c.pos[0]) &&
    Number.isFinite(c.pos[1])
  );
}

function hasFiniteSize(c) {
  return (
    Array.isArray(c.size) &&
    c.size.length === 2 &&
    Number.isFinite(c.size[0]) &&
    Number.isFinite(c.size[1])
  );
}

/**
 * Assign left-to-right layered positions when the LLM omits geometry.
 */
export function layoutArchitectureIr(raw) {
  const cleaned = sanitizeArchitectureIr(raw);
  const ir = cleaned ? structuredClone(cleaned) : null;
  if (!ir || typeof ir !== "object") return ir;
  const components = Array.isArray(ir.components) ? ir.components : [];
  ir.components = components;

  const needsLayout = components.some((c) => !hasFinitePos(c));
  if (!needsLayout) {
    for (const c of components) {
      if (!hasFiniteSize(c)) c.size = [130, 60];
    }
    let maxX = 320;
    let maxY = 240;
    for (const c of components) {
      const w = hasFiniteSize(c) ? c.size[0] : 130;
      const h = hasFiniteSize(c) ? c.size[1] : 60;
      if (hasFinitePos(c)) {
        maxX = Math.max(maxX, c.pos[0] + w + 48);
        maxY = Math.max(maxY, c.pos[1] + h + 140);
      }
    }
    if (!Array.isArray(ir.meta.viewBox) || ir.meta.viewBox.length < 2) {
      ir.meta.viewBox = [maxX, maxY];
    }
    return ir;
  }

  const ids = new Set(components.map((c) => c.id));
  const incoming = new Map([...ids].map((id) => [id, 0]));
  const outs = new Map([...ids].map((id) => [id, []]));
  for (const edge of ir.connections || []) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
    outs.get(edge.from).push(edge.to);
  }

  const layerOf = new Map();
  const queue = [];
  for (const c of components) {
    if ((incoming.get(c.id) || 0) === 0) {
      layerOf.set(c.id, 0);
      queue.push(c.id);
    }
  }
  if (!queue.length && components[0]) {
    layerOf.set(components[0].id, 0);
    queue.push(components[0].id);
  }
  while (queue.length) {
    const id = queue.shift();
    const base = layerOf.get(id) || 0;
    for (const to of outs.get(id) || []) {
      const next = base + 1;
      if (!layerOf.has(to) || layerOf.get(to) < next) {
        layerOf.set(to, next);
        queue.push(to);
      }
    }
  }
  for (const c of components) {
    if (!layerOf.has(c.id)) layerOf.set(c.id, 0);
  }

  const byLayer = new Map();
  for (const c of components) {
    const L = layerOf.get(c.id) || 0;
    if (!byLayer.has(L)) byLayer.set(L, []);
    byLayer.get(L).push(c);
  }
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const colW = 200;
  const rowH = 110;
  const originX = 48;
  const originY = 80;
  let maxY = originY;
  for (const L of layers) {
    const col = byLayer.get(L) || [];
    col.forEach((c, i) => {
      c.pos = [originX + L * colW, originY + i * rowH];
      if (!hasFiniteSize(c)) c.size = [130, 60];
      maxY = Math.max(maxY, c.pos[1] + c.size[1]);
    });
  }
  const maxX = originX + (layers.length || 1) * colW + 80;
  ir.meta.viewBox = [
    Math.max(320, maxX),
    Math.max(240, maxY + 140),
  ];
  return ir;
}

export function normalizeArchitectureIr(raw) {
  const ir = layoutArchitectureIr(raw);
  if (!ir?.components?.length) {
    const e = new Error("architecture needs at least one component");
    e.code = "ARCH_EMPTY";
    throw e;
  }
  for (const c of ir.components) {
    if (!c.id || !COMPONENT_TYPES.has(c.type) || !c.label) {
      const e = new Error(
        `invalid component (need id, type in known set, label): ${JSON.stringify(c)}`,
      );
      e.code = "ARCH_COMPONENT";
      throw e;
    }
  }
  if (!Array.isArray(ir.connections)) ir.connections = [];
  if (!Array.isArray(ir.boundaries)) ir.boundaries = [];
  if (!Array.isArray(ir.cards)) ir.cards = [];
  return ir;
}

/**
 * Extract Archify architecture JSON from model reply text.
 */
export function extractArchitectureIr(text) {
  const s = String(text || "");
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];
  if (fence) candidates.push(fence[1]);
  const brace = s.match(/\{[\s\S]*"diagram_type"\s*:\s*"architecture"[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);
  const ready = s.match(
    /\{[\s\S]*"ready"\s*:\s*true[\s\S]*"components"\s*:\s*\[[\s\S]*\}/,
  );
  if (ready) candidates.push(ready[0]);
  // Prefer last <<<JSON>>> block when present (chat envelope).
  const marker = s.lastIndexOf("<<<JSON>>>");
  if (marker >= 0) {
    const after = s.slice(marker + "<<<JSON>>>".length).trim();
    const m = after.match(/\{[\s\S]*\}/);
    if (m) candidates.unshift(m[0]);
  }
  for (const chunk of candidates) {
    try {
      const obj = JSON.parse(chunk.trim());
      const ir = sanitizeArchitectureIr(obj);
      if (ir?.components?.length) return ir;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function architectureSummary(ir) {
  const comps = (ir?.components || [])
    .map((c) => `${c.label}${c.sublabel ? ` (${c.sublabel})` : ""}`)
    .slice(0, 16);
  const title = ir?.meta?.title || "Architecture";
  return `${title}: ${comps.join(" → ")}`;
}

/**
 * Render IR to HTML under liveRoot/architecture/<hash>.html
 */
export function renderArchitectureHtml(liveRoot, irInput) {
  const ensured = ensureArchifyInstalled();
  if (!ensured.ok) {
    const e = new Error(ensured.error || "Archify install failed");
    e.code = "ARCHIFY_MISSING";
    throw e;
  }
  const ir = normalizeArchitectureIr(irInput);
  const store = architectureStoreDir(liveRoot);
  fs.mkdirSync(store, { recursive: true });
  const body = `${JSON.stringify(ir)}\n`;
  const key = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const jsonPath = path.join(store, `${key}.json`);
  const htmlPath = path.join(store, `${key}.html`);
  fs.writeFileSync(jsonPath, body, "utf8");

  const bin = archifyBin();
  const skillRoot = path.join(archifyHome(), "archify");
  const result = spawnSync(
    process.execPath,
    [
      bin,
      "deliver",
      "architecture",
      jsonPath,
      htmlPath,
      "--quality",
      "standard",
      "--json",
    ],
    {
      cwd: skillRoot,
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (result.status !== 0 || !fs.existsSync(htmlPath)) {
    let detail = result.stderr || result.stdout || "deliver failed";
    try {
      const j = JSON.parse(result.stdout || "{}");
      if (Array.isArray(j.errors) && j.errors.length) {
        detail = j.errors.map((x) => x.message || x.code).join("; ");
      } else if (j.error) detail = j.error;
    } catch {
      /* keep detail */
    }
    const e = new Error(detail);
    e.code = "ARCHIFY_DELIVER";
    throw e;
  }
  return {
    key,
    jsonPath,
    htmlPath,
    urlPath: `/api/architecture/${key}.html`,
    summary: architectureSummary(ir),
    ir,
  };
}
