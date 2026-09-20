/**
 * Extract Archify architecture JSON from assistant reply text (browser).
 * Must strip chat/Brief extras — Archify rejects additionalProperties.
 */

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

function pickKeys(obj, allowed) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) out[key] = obj[key];
  }
  return out;
}

export function sanitizeArchitectureIr(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!Array.isArray(raw.components)) return null;

  const metaIn = raw.meta && typeof raw.meta === "object" ? raw.meta : {};
  const meta = pickKeys(metaIn, [
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
  if (!meta.title) {
    meta.title =
      (typeof raw.title === "string" && raw.title.trim()) || "Architecture";
  }
  if (!meta.quality_profile) meta.quality_profile = "standard";

  const components = raw.components
    .filter((c) => c && typeof c === "object")
    .map((c) =>
      pickKeys(c, [
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
      ]),
    )
    .filter((c) => c.id && c.type && c.label && COMPONENT_TYPES.has(c.type));

  const connections = (Array.isArray(raw.connections) ? raw.connections : [])
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const row = pickKeys(e, [
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
      if (row.variant && !CONNECTION_VARIANTS.has(row.variant)) {
        delete row.variant;
      }
      return row;
    })
    .filter((e) => e.from && e.to);

  const boundaries = (Array.isArray(raw.boundaries) ? raw.boundaries : [])
    .filter((b) => b && typeof b === "object")
    .map((b) => pickKeys(b, ["kind", "label", "wraps", "pad"]))
    .filter(
      (b) =>
        BOUNDARY_KINDS.has(b.kind) &&
        b.label &&
        Array.isArray(b.wraps) &&
        b.wraps.length,
    );

  const cards = (Array.isArray(raw.cards) ? raw.cards : [])
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const row = pickKeys(c, ["dot", "title", "items"]);
      if (!CARD_DOTS.has(row.dot)) row.dot = "cyan";
      if (!Array.isArray(row.items)) row.items = [];
      return row;
    })
    .filter((c) => c.title);

  dropUnpinnedRepositoryEvidence(meta, components);

  return {
    schema_version: 1,
    diagram_type: "architecture",
    meta,
    components,
    connections,
    boundaries,
    cards,
  };
}

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
  // Prefer marker/fence; avoid nested [\s\S]* scans on huge blobs (ReDoS risk).
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
