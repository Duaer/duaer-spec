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

  // Archify treats any component.sources as repository evidence and then
  // requires /meta/repository (full SHA + --repo-root). Dispatch-graph status
  // paths are not repo files — drop them unless the pin is complete.
  dropUnpinnedRepositoryEvidence(meta, components);

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

/** Keep sources only when Archify can verify a pinned repository. */
function dropUnpinnedRepositoryEvidence(meta, components) {
  const repo = meta.repository;
  const pinned =
    repo &&
    typeof repo === "object" &&
    /^[a-f0-9]{40}$/i.test(String(repo.revision || "")) &&
    typeof repo.url === "string" &&
    repo.url.trim().length > 0;
  if (pinned) return;
  delete meta.repository;
  for (const c of components) delete c.sources;
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

/** Rough mirror of Archify textUnits (CJK ≈ 2 units). */
function approxTextUnits(text) {
  let units = 0;
  for (const ch of String(text || "")) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    units += cp > 0xff ? 2 : 1;
  }
  return units;
}

// Archify: minimumNodeTextWidth = units * minimumFont * 0.6; available = width - 8
const TEXT_MIN_FONT = 6;
const TEXT_WIDTH_FACTOR = 0.6;
const TEXT_PAD = 8;
const MAX_COMPONENT_W = 200;
const MIN_COMPONENT_W = 130;
const MAX_EDGE_LABEL_UNITS = 22;

function minTextWidth(text) {
  return approxTextUnits(text) * TEXT_MIN_FONT * TEXT_WIDTH_FACTOR;
}

function truncateToUnits(text, maxUnits) {
  const s = String(text || "").trim();
  if (!s) return s;
  if (approxTextUnits(s) <= maxUnits) return s;
  let out = "";
  let units = 0;
  const budget = Math.max(2, maxUnits - 2);
  for (const ch of s) {
    const add = ch.codePointAt(0) > 0xff ? 2 : 1;
    if (units + add > budget) break;
    out += ch;
    units += add;
  }
  return `${out}…`;
}

/**
 * Fit label/sublabel/tag into component width (widen up to MAX, else truncate).
 * Fix edge labels that would sit on nodes (shorten + labelDy).
 */
export function repairArchitectureGeometry(ir) {
  if (!ir || typeof ir !== "object") return ir;
  const components = Array.isArray(ir.components) ? ir.components : [];
  for (const c of components) {
    let w = hasFiniteSize(c) ? c.size[0] : 140;
    let h = hasFiniteSize(c) ? c.size[1] : 64;
    for (const field of ["label", "sublabel", "tag"]) {
      if (!c[field]) continue;
      c[field] = String(c[field]).trim();
      if (!c[field]) {
        delete c[field];
        continue;
      }
      let need = minTextWidth(c[field]);
      let avail = w - TEXT_PAD;
      if (need <= avail) continue;
      const widened = Math.ceil(need + TEXT_PAD + 4);
      if (widened <= MAX_COMPONENT_W) {
        w = widened;
        continue;
      }
      w = MAX_COMPONENT_W;
      const maxUnits = Math.floor((MAX_COMPONENT_W - TEXT_PAD) / (TEXT_MIN_FONT * TEXT_WIDTH_FACTOR));
      c[field] = truncateToUnits(c[field], maxUnits);
    }
    c.size = [Math.max(MIN_COMPONENT_W, Math.min(MAX_COMPONENT_W, w)), Math.max(56, h)];
  }

  const connections = Array.isArray(ir.connections) ? ir.connections : [];
  for (const e of connections) {
    if (!e || typeof e !== "object") continue;
    if (e.label) {
      e.label = truncateToUnits(String(e.label).trim(), MAX_EDGE_LABEL_UNITS);
      if (!e.label) delete e.label;
    }
    if (e.label && e.labelAt == null && e.labelDx == null && e.labelDy == null) {
      // Pull labels above the edge so they clear horizontally adjacent boxes.
      e.labelDy = -36;
    }
  }
  return ir;
}

/**
 * Detour edges that would pass through unrelated components.
 * Same-row long edges prefer a bottom/top via under/over the floor.
 * Diagonal / stacked edges pick a corridor whose segments stay clear
 * of unrelated boxes (Archify clean-flow edge-through-node).
 * @param {object} ir
 */
export function routeCrossingEdges(ir) {
  if (!ir || typeof ir !== "object") return ir;
  const components = Array.isArray(ir.components) ? ir.components : [];
  const connections = Array.isArray(ir.connections) ? ir.connections : [];
  if (components.length < 3 || !connections.length) return ir;

  const byId = new Map();
  let maxRight = 0;
  let minLeft = Infinity;
  let floorY = 0;
  let ceilY = Infinity;
  for (const c of components) {
    if (!c?.id || !hasFinitePos(c)) continue;
    const w = hasFiniteSize(c) ? c.size[0] : 140;
    const h = hasFiniteSize(c) ? c.size[1] : 64;
    const box = {
      id: c.id,
      x: c.pos[0],
      y: c.pos[1],
      w,
      h,
      cx: c.pos[0] + w / 2,
      cy: c.pos[1] + h / 2,
      bottom: c.pos[1] + h,
      top: c.pos[1],
      right: c.pos[0] + w,
      left: c.pos[0],
    };
    byId.set(c.id, box);
    maxRight = Math.max(maxRight, box.right);
    minLeft = Math.min(minLeft, box.left);
    floorY = Math.max(floorY, box.bottom);
    ceilY = Math.min(ceilY, box.top);
  }
  if (byId.size < 3) return ir;

  const CLEAR = 8;

  /** Axis-aligned segment vs box with clearance (Archify uses ~2px). */
  function segHitsBox(x1, y1, x2, y2, box) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return (
      maxX >= box.left - CLEAR &&
      minX <= box.right + CLEAR &&
      maxY >= box.top - CLEAR &&
      minY <= box.bottom + CLEAR
    );
  }

  function pathClear(pts, skipA, skipB) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      for (const other of byId.values()) {
        if (other.id === skipA || other.id === skipB) continue;
        if (segHitsBox(x1, y1, x2, y2, other)) return false;
      }
    }
    return true;
  }

  /** Port point on a box side. */
  function port(box, side) {
    switch (side) {
      case "left":
        return [box.left, box.cy];
      case "right":
        return [box.right, box.cy];
      case "top":
        return [box.cx, box.top];
      case "bottom":
        return [box.cx, box.bottom];
      default:
        return [box.cx, box.cy];
    }
  }

  function tryRoute(a, b, fromSide, toSide, via) {
    const pts = [port(a, fromSide), ...via, port(b, toSide)];
    if (!pathClear(pts, a.id, b.id)) return null;
    return { fromSide, toSide, via };
  }

  /** Vertical gutters between sorted unique column centers. */
  function gutterXs() {
    const cols = [...byId.values()]
      .map((b) => b.cx)
      .sort((x, y) => x - y);
    const uniq = [];
    for (const x of cols) {
      if (!uniq.length || Math.abs(uniq[uniq.length - 1] - x) > 40) uniq.push(x);
    }
    const gutters = [Math.round(minLeft - 56), Math.round(maxRight + 56)];
    for (let i = 0; i < uniq.length - 1; i++) {
      const leftBoxes = [...byId.values()].filter((b) => Math.abs(b.cx - uniq[i]) < 48);
      const rightBoxes = [...byId.values()].filter(
        (b) => Math.abs(b.cx - uniq[i + 1]) < 48,
      );
      const rightEdge = Math.max(...leftBoxes.map((b) => b.right));
      const leftEdge = Math.min(...rightBoxes.map((b) => b.left));
      if (leftEdge - rightEdge > 40) {
        gutters.push(Math.round((rightEdge + leftEdge) / 2));
      }
    }
    return gutters;
  }

  let detourIndex = 0;

  for (const e of connections) {
    if (!e || typeof e !== "object") continue;
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;

    const horizSpan = Math.abs(a.cx - b.cx);
    const vertSpan = Math.abs(a.cy - b.cy);
    if (horizSpan < 40 && vertSpan < 80) continue;

    const boxMinX = Math.min(a.left, b.left);
    const boxMaxX = Math.max(a.right, b.right);
    const boxMinY = Math.min(a.top, b.top);
    const boxMaxY = Math.max(a.bottom, b.bottom);

    let blocked = false;
    for (const other of byId.values()) {
      if (other.id === a.id || other.id === b.id) continue;
      const inBox =
        other.right > boxMinX + 8 &&
        other.left < boxMaxX - 8 &&
        other.bottom > boxMinY + 8 &&
        other.top < boxMaxY - 8;
      if (inBox) {
        blocked = true;
        break;
      }
    }

    if (!blocked && Array.isArray(e.via) && e.via.length) {
      const viaY = Number(e.via[0]?.[1]);
      if (
        Number.isFinite(viaY) &&
        (e.fromSide === "bottom" || e.toSide === "bottom")
      ) {
        for (const other of byId.values()) {
          if (other.id === a.id || other.id === b.id) continue;
          const underA =
            Math.abs(other.cx - a.cx) < 48 &&
            other.top >= a.bottom - 4 &&
            other.top < viaY;
          const underB =
            Math.abs(other.cx - b.cx) < 48 &&
            other.top >= b.bottom - 4 &&
            other.top < viaY;
          if (underA || underB) {
            blocked = true;
            break;
          }
        }
      }
    }

    if (!blocked) continue;

    const sameRow = vertSpan < 80 && horizSpan >= 160;
    const candidates = [];

    if (sameRow) {
      const viaYBot = floorY + 48 + detourIndex * 28;
      const viaYTop = ceilY - 48 - detourIndex * 28;
      candidates.push(
        tryRoute(a, b, "bottom", "bottom", [
          [Math.round(a.cx), Math.round(viaYBot)],
          [Math.round(b.cx), Math.round(viaYBot)],
        ]),
      );
      candidates.push(
        tryRoute(a, b, "top", "top", [
          [Math.round(a.cx), Math.round(viaYTop)],
          [Math.round(b.cx), Math.round(viaYTop)],
        ]),
      );
      // Side corridors for same-row when floor/ceil are blocked
      for (const side of ["right", "left"]) {
        const viaX =
          side === "right"
            ? Math.round(maxRight + 56 + detourIndex * 36)
            : Math.round(minLeft - 56 - detourIndex * 36);
        candidates.push(
          tryRoute(a, b, side, side, [
            [viaX, Math.round(a.cy)],
            [viaX, Math.round(b.cy)],
          ]),
        );
      }
    } else {
      const gutters = gutterXs();
      const ceil = ceilY - 48 - detourIndex * 20;
      const floor = floorY + 48 + detourIndex * 20;
      for (const gx of gutters) {
        // Approach destination from the gutter side
        const toSide = b.cx < gx ? "right" : "left";
        const fromSide = a.cx < gx ? "right" : "left";
        // Top wrap into gutter then into target
        candidates.push(
          tryRoute(a, b, "top", toSide, [
            [Math.round(a.cx), Math.round(ceil)],
            [Math.round(gx), Math.round(ceil)],
            [Math.round(gx), Math.round(b.cy)],
          ]),
        );
        candidates.push(
          tryRoute(a, b, fromSide, toSide, [
            [Math.round(gx), Math.round(a.cy)],
            [Math.round(gx), Math.round(b.cy)],
          ]),
        );
        candidates.push(
          tryRoute(a, b, fromSide, "bottom", [
            [Math.round(gx), Math.round(a.cy)],
            [Math.round(gx), Math.round(floor)],
            [Math.round(b.cx), Math.round(floor)],
          ]),
        );
        candidates.push(
          tryRoute(a, b, "bottom", toSide, [
            [Math.round(a.cx), Math.round(floor)],
            [Math.round(gx), Math.round(floor)],
            [Math.round(gx), Math.round(b.cy)],
          ]),
        );
      }
      // Prefer right outer when mid is leftish (matches stacked fixtures)
      const preferRight =
        (a.cx + b.cx) / 2 <= (minLeft + maxRight) / 2 + (maxRight - minLeft) * 0.1;
      const orderedSides = preferRight ? ["right", "left"] : ["left", "right"];
      for (const side of orderedSides) {
        const viaX =
          side === "right"
            ? Math.round(maxRight + 56 + detourIndex * 36)
            : Math.round(minLeft - 56 - detourIndex * 36);
        candidates.push(
          tryRoute(a, b, side, side, [
            [viaX, Math.round(a.cy)],
            [viaX, Math.round(b.cy)],
          ]),
        );
      }
    }

    const chosen = candidates.find(Boolean);
    if (!chosen) continue;

    detourIndex += 1;
    e.fromSide = chosen.fromSide;
    e.toSide = chosen.toSide;
    e.via = chosen.via;
    if (e.label && e.labelAt == null) {
      // Final placement is repaired by repairEdgeLabelPlacement; leave
      // bottom/top vias unmarked so that helper can pin labelAt on the via.
      if (chosen.fromSide === "bottom" || chosen.toSide === "bottom") {
        delete e.labelDx;
        delete e.labelDy;
      } else if (chosen.fromSide === "top" || chosen.toSide === "top") {
        delete e.labelDx;
        delete e.labelDy;
      } else {
        e.labelDx = chosen.fromSide === "right" ? -36 : 36;
        delete e.labelDy;
      }
    }
  }
  return ir;
}

/**
 * Keep edge labels off component boxes.
 * Bottom vias must place the label *below* the via (labelDy > 0) — a negative
 * dy pulls the label up into nodes that sit above the detour.
 * Vertical stacked edges get labelAt in the inter-box gap.
 * @param {object} ir
 */
export function repairEdgeLabelPlacement(ir) {
  if (!ir || typeof ir !== "object") return ir;
  const components = Array.isArray(ir.components) ? ir.components : [];
  const connections = Array.isArray(ir.connections) ? ir.connections : [];
  const boxes = [];
  const byId = new Map();
  for (const c of components) {
    if (!c?.id || !hasFinitePos(c)) continue;
    const w = hasFiniteSize(c) ? c.size[0] : 140;
    const h = hasFiniteSize(c) ? c.size[1] : 64;
    const box = {
      id: c.id,
      cx: c.pos[0] + w / 2,
      cy: c.pos[1] + h / 2,
      left: c.pos[0],
      right: c.pos[0] + w,
      top: c.pos[1],
      bottom: c.pos[1] + h,
    };
    byId.set(c.id, box);
    boxes.push(box);
  }

  const LABEL_W = 36;
  const LABEL_H = 16;

  function overlapsAny(lx, ly) {
    const left = lx - LABEL_W / 2;
    const right = lx + LABEL_W / 2;
    const top = ly - LABEL_H / 2;
    const bottom = ly + LABEL_H / 2;
    for (const box of boxes) {
      if (
        right > box.left &&
        left < box.right &&
        bottom > box.top &&
        top < box.bottom
      ) {
        return box;
      }
    }
    return null;
  }

  function edgeMid(e, a, b) {
    if (Array.isArray(e.via) && e.via.length >= 2) {
      const first = e.via[0];
      const last = e.via[e.via.length - 1];
      return [
        (Number(first[0]) + Number(last[0])) / 2,
        (Number(first[1]) + Number(last[1])) / 2,
      ];
    }
    return [(a.cx + b.cx) / 2, (a.cy + b.cy) / 2];
  }

  for (const e of connections) {
    if (!e?.label) continue;
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;

    const via = Array.isArray(e.via) ? e.via : null;
    const bottomVia =
      via &&
      via.length >= 2 &&
      (e.fromSide === "bottom" || e.toSide === "bottom");
    const topVia =
      via &&
      via.length >= 2 &&
      (e.fromSide === "top" || e.toSide === "top") &&
      !bottomVia;

    if (bottomVia) {
      // Stay under the floor detour — never pull up into co-row / mid-row boxes
      const midX = (Number(via[0][0]) + Number(via[via.length - 1][0])) / 2;
      const viaY = Number(via[0][1]);
      e.labelAt = [Math.round(midX), Math.round(viaY + 18)];
      delete e.labelDx;
      delete e.labelDy;
      continue;
    }
    if (topVia) {
      const midX = (Number(via[0][0]) + Number(via[via.length - 1][0])) / 2;
      const viaY = Number(via[0][1]);
      e.labelAt = [Math.round(midX), Math.round(viaY - 18)];
      delete e.labelDx;
      delete e.labelDy;
      continue;
    }

    if (e.labelAt != null) {
      const hit = overlapsAny(e.labelAt[0], e.labelAt[1]);
      if (!hit) continue;
      // Nudge below the overlapping box
      e.labelAt = [Math.round(hit.cx), Math.round(hit.bottom + 18)];
      continue;
    }

    const horizSpan = Math.abs(a.cx - b.cx);
    const vertSpan = Math.abs(a.cy - b.cy);
    if (vertSpan >= 60 && horizSpan < 80) {
      const upper = a.cy <= b.cy ? a : b;
      const lower = a.cy <= b.cy ? b : a;
      const gapY = (upper.bottom + lower.top) / 2;
      e.labelAt = [Math.round(a.cx + 56), Math.round(gapY)];
      delete e.labelDx;
      delete e.labelDy;
      continue;
    }

    if (e.labelDy == null && e.labelDx == null) {
      e.labelDy = -36;
    }

    // If the offset mid still lands on a box, pin labelAt clear of it
    const [mx, my] = edgeMid(e, a, b);
    const lx = mx + (Number(e.labelDx) || 0);
    const ly = my + (Number(e.labelDy) || 0);
    const hit = overlapsAny(lx, ly);
    if (hit) {
      const below = hit.bottom + 18;
      const above = hit.top - 18;
      const preferBelow = Math.abs(below - ly) <= Math.abs(above - ly);
      e.labelAt = [
        Math.round(hit.cx),
        Math.round(preferBelow ? below : above),
      ];
      delete e.labelDx;
      delete e.labelDy;
    }
  }
  return ir;
}

function recomputeViewBox(ir) {
  const components = ir.components || [];
  let maxX = 320;
  let maxY = 240;
  for (const c of components) {
    if (!hasFinitePos(c)) continue;
    const w = hasFiniteSize(c) ? c.size[0] : 130;
    const h = hasFiniteSize(c) ? c.size[1] : 60;
    maxX = Math.max(maxX, c.pos[0] + w + 48);
    maxY = Math.max(maxY, c.pos[1] + h + 160);
  }
  for (const e of ir.connections || []) {
    if (!Array.isArray(e?.via)) continue;
    for (const pt of e.via) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      if (!Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue;
      maxX = Math.max(maxX, pt[0] + 48);
      maxY = Math.max(maxY, pt[1] + 80);
    }
  }
  ir.meta.viewBox = [maxX, maxY];
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
  repairArchitectureGeometry(ir);

  const needsLayout = components.some((c) => !hasFinitePos(c));
  if (!needsLayout) {
    for (const c of components) {
      if (!hasFiniteSize(c)) c.size = [140, 64];
    }
    repairArchitectureGeometry(ir);
    routeCrossingEdges(ir);
    repairEdgeLabelPlacement(ir);
    recomputeViewBox(ir);
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
  // BFS once per node. Re-relaxing longer paths + cycles used to spin forever
  // and freeze the whole live desk (deliverables / chat / architecture).
  const maxSteps = Math.max(8, components.length * components.length + 8);
  let steps = 0;
  while (queue.length && steps < maxSteps) {
    steps += 1;
    const id = queue.shift();
    const base = layerOf.get(id) || 0;
    for (const to of outs.get(id) || []) {
      if (layerOf.has(to)) continue;
      layerOf.set(to, base + 1);
      queue.push(to);
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
  const maxCompW = Math.max(
    140,
    ...components.map((c) => (hasFiniteSize(c) ? c.size[0] : 140)),
  );
  const colW = Math.max(220, maxCompW + 70);
  const rowH = 130;
  const originX = 48;
  const originY = 96;
  let maxY = originY;
  for (const L of layers) {
    const col = byLayer.get(L) || [];
    col.forEach((c, i) => {
      c.pos = [originX + L * colW, originY + i * rowH];
      if (!hasFiniteSize(c)) c.size = [140, 64];
      maxY = Math.max(maxY, c.pos[1] + c.size[1]);
    });
  }
  repairArchitectureGeometry(ir);
  routeCrossingEdges(ir);
  repairEdgeLabelPlacement(ir);
  const maxX = originX + (layers.length || 1) * colW + 80;
  ir.meta.viewBox = [
    Math.max(320, maxX),
    Math.max(240, maxY + 160),
  ];
  recomputeViewBox(ir);
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
  const s = String(text || "").slice(0, 400_000);
  const candidates = [];
  const marker = s.lastIndexOf("<<<JSON>>>");
  if (marker >= 0) {
    const after = s.slice(marker + "<<<JSON>>>".length).trim().slice(0, 350_000);
    const start = after.indexOf("{");
    const end = after.lastIndexOf("}");
    if (start >= 0 && end > start) candidates.push(after.slice(start, end + 1));
  }
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].slice(0, 350_000));
  if (!candidates.length) {
    const dt = s.indexOf('"diagram_type"');
    const ready = s.indexOf('"ready"');
    const anchor = dt >= 0 ? dt : ready;
    if (anchor >= 0) {
      const windowStart = Math.max(0, s.lastIndexOf("{", anchor));
      const window = s.slice(windowStart, windowStart + 350_000);
      const end = window.lastIndexOf("}");
      if (end > 0) candidates.push(window.slice(0, end + 1));
    }
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

/** CSS id used when patching Archify HTML for the Duaer desk embed. */
export const DUAER_EMBED_FIT_STYLE_ID = "duaer-embed-fit";
/** Script id: force single-node zoom on click inside the desk iframe. */
export const DUAER_EMBED_ZOOM_SCRIPT_ID = "duaer-embed-node-zoom";
/** Script id: expand passport fully + report embed height to the desk. */
export const DUAER_EMBED_EXPAND_SCRIPT_ID = "duaer-embed-passport-expand";
/** Script id: present mode keeps passport but does not zoom the camera. */
export const DUAER_PRESENT_NO_ZOOM_SCRIPT_ID = "duaer-present-no-zoom";
/** postMessage source for embed → desk height sync. */
export const DUAER_ARCH_EMBED_MESSAGE_SOURCE = "duaer-arch-embed";

/**
 * Archify's .diagram-container uses overflow:hidden (one-screen reader).
 * Inside the Duaer iframe we need the full diagram height — inject overrides
 * for data-embed=true so the container does not clip.
 * Also restore `.focus-chip` (semantic passport): Archify hides it in embed mode.
 * Replaces any prior `#duaer-embed-fit` block so upgrades apply to cached HTML.
 */
export function injectDuaerEmbedFitCss(html) {
  const src = String(html || "");
  const style = `<style id="${DUAER_EMBED_FIT_STYLE_ID}">
html[data-embed="true"],
html[data-embed="true"] body {
  height: auto !important;
  max-height: none !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
html[data-embed="true"] .container,
html[data-embed="true"] .diagram-container {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  position: relative !important;
}
/* 100px upper-left gutter: chip stays in-view while sitting 100px
   up/left relative to the diagram nodes (no negative inset clip). */
html[data-embed="true"] .diagram-container {
  padding-top: 100px !important;
  padding-left: 100px !important;
  box-sizing: border-box !important;
}
html[data-embed="true"] .diagram-container svg {
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  max-height: none !important;
  display: block !important;
}
html[data-embed="true"] .diagram-container svg [data-node-id] {
  cursor: pointer;
}
/* Archify embed mode hides the node passport; restore it for the desk. */
html[data-embed="true"] .focus-chip {
  display: block !important;
  position: absolute !important;
  left: 0.75rem !important;
  top: 0.75rem !important;
  z-index: 10000 !important;
  width: min(22rem, calc(100% - 1.5rem - 100px)) !important;
  max-width: calc(100% - 1.5rem - 100px) !important;
  max-height: none !important;
  overflow: visible !important;
  pointer-events: auto !important;
}
/* Expand passport body fully — no inner scroll in the desk embed. */
html[data-embed="true"] .focus-chip .relationship-lens-list {
  display: block !important;
  max-height: none !important;
  overflow: visible !important;
}
html[data-embed="true"] .focus-chip[hidden] {
  display: none !important;
}
</style>`;
  const re = new RegExp(
    `<style\\s+id="${DUAER_EMBED_FIT_STYLE_ID}"[\\s\\S]*?<\\/style>`,
    "i",
  );
  if (re.test(src)) {
    return src.replace(re, style);
  }
  if (/<\/head>/i.test(src)) {
    return src.replace(/<\/head>/i, `${style}\n</head>`);
  }
  return `${style}\n${src}`;
}

/**
 * Archify reveal() skips real zoom when iframe width ≤720, and neighbor framing
 * often keeps scale at 1 for hub nodes. Force desktop single-node framing in
 * the Duaer embed so every component click enlarges.
 */
export function injectDuaerEmbedNodeZoom(html) {
  const src = String(html || "");
  if (src.includes(`id="${DUAER_EMBED_ZOOM_SCRIPT_ID}"`)) return src;
  const script = `<script id="${DUAER_EMBED_ZOOM_SCRIPT_ID}">
(function () {
  if (!document.documentElement || document.documentElement.getAttribute("data-embed") !== "true") return;
  function install() {
    if (!window.Archify || !Archify.view || typeof Archify.view.reveal !== "function") return false;
    if (Archify.view.__duaerEmbedZoom) return true;
    var original = Archify.view.reveal;
    Archify.view.reveal = function (ids, options) {
      var opts = Object.assign({}, options || {}, {
        includeNeighbors: false,
        maxScale: 2.6,
        padding: 28
      });
      var forced = false;
      var desc = Object.getOwnPropertyDescriptor(window, "innerWidth");
      try {
        if ((window.innerWidth || 0) <= 720) {
          Object.defineProperty(window, "innerWidth", {
            configurable: true,
            get: function () { return 1280; }
          });
          forced = true;
        }
        return original.call(Archify.view, ids, opts);
      } finally {
        if (forced) {
          try {
            if (desc) Object.defineProperty(window, "innerWidth", desc);
            else delete window.innerWidth;
          } catch (_) {}
        }
      }
    };
    Archify.view.__duaerEmbedZoom = true;
    return true;
  }
  if (install()) return;
  var n = 0;
  var timer = setInterval(function () {
    if (install() || ++n > 60) clearInterval(timer);
  }, 50);
})();
</script>`;
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${script}\n</body>`);
  }
  return `${src}\n${script}`;
}

/**
 * Expand the node passport fully in embed (no inner scroll) and tell the desk
 * iframe how tall the document needs to be so the chip is not clipped.
 * Replaces any prior expand script so upgrades apply to cached HTML.
 */
export function injectDuaerEmbedPassportExpand(html) {
  const src = String(html || "");
  const script = `<script id="${DUAER_EMBED_EXPAND_SCRIPT_ID}">
(function () {
  if (!document.documentElement || document.documentElement.getAttribute("data-embed") !== "true") return;
  var SOURCE = ${JSON.stringify(DUAER_ARCH_EMBED_MESSAGE_SOURCE)};
  function chipEl() { return document.getElementById("focus-chip"); }
  function expandChip() {
    var chip = chipEl();
    if (!chip || chip.hasAttribute("hidden")) return;
    chip.setAttribute("data-relations-expanded", "true");
  }
  function reportHeight() {
    expandChip();
    var need = 0;
    var container = document.querySelector(".diagram-container");
    var svg = container ? container.querySelector("svg") : null;
    if (svg) {
      var sr = svg.getBoundingClientRect();
      var cr = container.getBoundingClientRect();
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      need = Math.max(
        Math.ceil(y + sr.bottom + 28),
        Math.ceil(y + cr.bottom + 16)
      );
    }
    need = Math.max(
      need,
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );
    var chip = chipEl();
    if (chip && !chip.hasAttribute("hidden")) {
      var r = chip.getBoundingClientRect();
      var sy = window.scrollY || document.documentElement.scrollTop || 0;
      need = Math.max(need, Math.ceil(sy + r.bottom + 24));
    }
    if (need > 0 && window.parent && window.parent !== window) {
      window.parent.postMessage({ source: SOURCE, type: "height", height: need }, "*");
    }
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      reportHeight();
    });
  }
  function watch() {
    expandChip();
    schedule();
    var chip = chipEl();
    if (chip && !chip.__duaerExpandObserved) {
      chip.__duaerExpandObserved = true;
      new MutationObserver(schedule).observe(chip, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  setTimeout(schedule, 120);
  setTimeout(schedule, 600);
})();
</script>`;
  const re = new RegExp(
    `<script\\s+id="${DUAER_EMBED_EXPAND_SCRIPT_ID}"[\\s\\S]*?<\\/script>`,
    "i",
  );
  if (re.test(src)) {
    return src.replace(re, script);
  }
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${script}\n</body>`);
  }
  return `${src}\n${script}`;
}

/**
 * Present / fullscreen view: keep node passport, do not enlarge the camera.
 * Used for dispatch graphs that are already large enough (`?noz=1`).
 */
export function injectDuaerPresentNoZoom(html) {
  const src = String(html || "");
  const script = `<script id="${DUAER_PRESENT_NO_ZOOM_SCRIPT_ID}">
(function () {
  function install() {
    if (!window.Archify || !Archify.view || typeof Archify.view.reveal !== "function") return false;
    if (Archify.view.__duaerPresentNoZoom) return true;
    var original = Archify.view.reveal;
    Archify.view.reveal = function (ids, options) {
      var opts = Object.assign({}, options || {}, {
        includeNeighbors: false,
        maxScale: 1,
        minScale: 1,
        padding: 56,
        animate: false
      });
      return original.call(Archify.view, ids, opts);
    };
    Archify.view.__duaerPresentNoZoom = true;
    return true;
  }
  if (install()) return;
  var n = 0;
  var timer = setInterval(function () {
    if (install() || ++n > 60) clearInterval(timer);
  }, 50);
})();
</script>`;
  const re = new RegExp(
    `<script\\s+id="${DUAER_PRESENT_NO_ZOOM_SCRIPT_ID}"[\\s\\S]*?<\\/script>`,
    "i",
  );
  if (re.test(src)) {
    return src.replace(re, script);
  }
  if (/<\/body>/i.test(src)) {
    return src.replace(/<\/body>/i, `${script}\n</body>`);
  }
  return `${src}\n${script}`;
}

/** Apply all Duaer desk patches to Archify HTML (idempotent). */
export function injectDuaerEmbedPatches(html) {
  return injectDuaerEmbedNodeZoom(
    injectDuaerEmbedPassportExpand(injectDuaerEmbedFitCss(html)),
  );
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
  const patched = injectDuaerEmbedPatches(fs.readFileSync(htmlPath, "utf8"));
  fs.writeFileSync(htmlPath, patched, "utf8");
  return {
    key,
    jsonPath,
    htmlPath,
    urlPath: `/api/architecture/${key}.html`,
    summary: architectureSummary(ir),
    ir,
  };
}
