/**
 * Persist per-project desk session under ~/.duaer/live/project-chats/.
 * Includes chat, confirm/revise cards, and job binding for progress.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function projectChatKey(projectPath) {
  const abs = String(projectPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!abs) return "";
  return createHash("sha256").update(abs).digest("hex").slice(0, 24);
}

export function projectChatPath(liveRoot, projectPath) {
  const key = projectChatKey(projectPath);
  if (!key) return null;
  return path.join(liveRoot, "project-chats", `${key}.json`);
}

function clipCard(card) {
  if (!card || typeof card !== "object") {
    return { goal: "", outOfScope: "", acceptance: "", assumptions: "" };
  }
  return {
    goal: String(card.goal || "").slice(0, 8000),
    outOfScope: String(card.outOfScope || "").slice(0, 8000),
    acceptance: String(card.acceptance || "").slice(0, 8000),
    assumptions: String(card.assumptions || "").slice(0, 8000),
  };
}

/** One locked/dispatched 改进卡 per revision number (iteration line). */
function clipReviseCardEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const revision = Number(entry.revision);
  if (!Number.isFinite(revision) || revision < 1) return null;
  const card = clipCard(entry);
  const arch = clipArchitectureSnapshot(entry.architecture);
  const out = {
    revision: Math.floor(revision),
    goal: card.goal,
    outOfScope: card.outOfScope,
    acceptance: card.acceptance,
    assumptions: card.assumptions,
  };
  if (arch) out.architecture = arch;
  return out;
}

function clipArchitectureSnapshot(arch) {
  if (!arch || typeof arch !== "object" || !arch.url) return null;
  return {
    url: String(arch.url).slice(0, 300),
    ir: null,
    summary: String(arch.summary || "").slice(0, 2000),
    changed: Boolean(arch.changed),
    fingerprint: String(arch.fingerprint || "").slice(0, 200),
  };
}

function clipReviseCards(list) {
  if (!Array.isArray(list)) return [];
  const byRev = new Map();
  for (const raw of list) {
    const entry = clipReviseCardEntry(raw);
    if (entry) byRev.set(entry.revision, entry);
  }
  return [...byRev.values()].sort((a, b) => a.revision - b.revision).slice(-40);
}

function clipReviseDraft(draft) {
  const entry = clipReviseCardEntry(draft);
  return entry;
}

function clipReviseExpanded(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).slice(0, 20);
    if (!key) continue;
    out[key] = Boolean(v);
  }
  return out;
}

function clipReviseCardFocus(focus) {
  if (focus == null || focus === "") return null;
  const n = Number(focus);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/**
 * Seed version list from legacy single reviseCard + lastRevision.
 * @param {unknown[]} cards
 * @param {object|null} lastRevision
 * @param {ReturnType<typeof clipCard>} reviseCard
 */
function migrateReviseCards(cards, lastRevision, reviseCard) {
  const list = clipReviseCards(cards);
  if (list.length) return list;
  const rev = Number(lastRevision?.revision);
  if (!Number.isFinite(rev) || rev < 1) return list;
  const fromLast = {
    revision: Math.floor(rev),
    goal: String(lastRevision?.change || reviseCard?.goal || ""),
    outOfScope: String(lastRevision?.keep || reviseCard?.outOfScope || ""),
    acceptance: String(
      lastRevision?.acceptance || reviseCard?.acceptance || "",
    ),
    assumptions: String(lastRevision?.reason || reviseCard?.assumptions || ""),
  };
  return clipReviseCards([fromLast]);
}

function clipMessages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({
      role: m.role,
      content: String(m.content || "").slice(0, 20000),
    }))
    .slice(-200);
}

function clipValidate(v) {
  if (!v || typeof v !== "object") {
    return {
      kind: "confirm",
      fingerprint: "",
      status: "idle",
      summary: "",
      issues: [],
    };
  }
  const status = ["idle", "checking", "passed", "failed"].includes(v.status)
    ? v.status === "checking"
      ? "idle" // never restore mid-flight
      : v.status
    : "idle";
  return {
    kind: v.kind === "revise" ? "revise" : "confirm",
    fingerprint: String(v.fingerprint || "").slice(0, 20000),
    status,
    summary: String(v.summary || "").slice(0, 2000),
    issues: Array.isArray(v.issues)
      ? v.issues.map((x) => String(x).slice(0, 500)).slice(0, 20)
      : [],
  };
}

function clipDeskMode(mode) {
  const m = String(mode || "").trim();
  if (m === "revise" || m === "architecture") return m;
  return "specify";
}

function clipArchitecture(arch) {
  if (!arch || typeof arch !== "object") {
    return {
      status: "idle",
      ir: null,
      url: null,
      summary: "",
      confirmed: false,
    };
  }
  return {
    status: String(arch.status || "idle").slice(0, 20),
    // Never persist deep IR graphs — they blow JSON.stringify call stack.
    ir: null,
    url: arch.url ? String(arch.url).slice(0, 300) : null,
    summary: String(arch.summary || "").slice(0, 2000),
    confirmed: Boolean(arch.confirmed),
  };
}

function clipArchitecturePrevious(prev) {
  if (!prev || typeof prev !== "object" || !prev.url) return null;
  return {
    ir: null,
    url: String(prev.url).slice(0, 300),
    summary: String(prev.summary || "").slice(0, 2000),
  };
}

function emptySession(projectPath = "") {
  return {
    projectPath: String(projectPath || "").trim(),
    updatedAt: null,
    messages: [],
    reviseMessages: [],
    rawAsk: "",
    card: clipCard(null),
    reviseCard: clipCard(null),
    reviseCards: [],
    reviseDraft: null,
    reviseCardFocus: null,
    initialArchitecture: null,
    reviseExpanded: {},
    originalCard: null,
    jobId: null,
    locked: false,
    mode: "specify",
    reviseLocked: false,
    revisePlanConfirmed: false,
    lastRevision: null,
    deployTarget: "none",
    agentId: "",
    validate: clipValidate(null),
    architecture: clipArchitecture(null),
    architecturePrevious: null,
    architectureMessages: [],
    dispatchPhase: null,
  };
}

/**
 * @returns {ReturnType<typeof emptySession>}
 */
export function readProjectChat(liveRoot, projectPath) {
  const file = projectChatPath(liveRoot, projectPath);
  const empty = emptySession(projectPath);
  if (!file || !fs.existsSync(file)) return empty;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      projectPath: String(raw.projectPath || projectPath || "").trim(),
      updatedAt: raw.updatedAt || null,
      messages: clipMessages(raw.messages),
      reviseMessages: clipMessages(raw.reviseMessages),
      rawAsk: String(raw.rawAsk || "").slice(0, 8000),
      card: clipCard(raw.card),
      reviseCard: clipCard(raw.reviseCard),
      reviseCards: migrateReviseCards(
        raw.reviseCards,
        raw.lastRevision,
        clipCard(raw.reviseCard),
      ),
      reviseDraft: clipReviseDraft(raw.reviseDraft),
      reviseCardFocus: clipReviseCardFocus(raw.reviseCardFocus),
      initialArchitecture: clipArchitectureSnapshot(raw.initialArchitecture),
      reviseExpanded: clipReviseExpanded(raw.reviseExpanded),
      originalCard: raw.originalCard ? clipCard(raw.originalCard) : null,
      jobId: raw.jobId ? String(raw.jobId).slice(0, 200) : null,
      locked: Boolean(raw.locked),
      mode: clipDeskMode(raw.mode),
      reviseLocked: Boolean(raw.reviseLocked),
      revisePlanConfirmed: Boolean(raw.revisePlanConfirmed),
      lastRevision:
        raw.lastRevision && typeof raw.lastRevision === "object"
          ? raw.lastRevision
          : null,
      deployTarget: String(raw.deployTarget || "none").slice(0, 40),
      agentId: String(raw.agentId || "").slice(0, 80),
      validate: clipValidate(raw.validate),
      architecture: clipArchitecture(raw.architecture),
      architecturePrevious: clipArchitecturePrevious(raw.architecturePrevious),
      architectureMessages: clipMessages(raw.architectureMessages),
      dispatchPhase: raw.dispatchPhase === "done" ? "done" : null,
    };
  } catch {
    return empty;
  }
}

export function writeProjectChat(liveRoot, payload) {
  const projectPath = String(payload.projectPath || "").trim();
  const file = projectChatPath(liveRoot, projectPath);
  if (!file) {
    const e = new Error("projectPath required");
    e.code = "EMPTY_PATH";
    throw e;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const doc = {
    projectPath,
    updatedAt: new Date().toISOString(),
    messages: clipMessages(payload.messages),
    reviseMessages: clipMessages(payload.reviseMessages),
    rawAsk: String(payload.rawAsk || "").slice(0, 8000),
    card: clipCard(payload.card),
    reviseCard: clipCard(payload.reviseCard),
    reviseCards: migrateReviseCards(
      payload.reviseCards,
      payload.lastRevision,
      clipCard(payload.reviseCard),
    ),
    reviseDraft: clipReviseDraft(payload.reviseDraft),
    reviseCardFocus: clipReviseCardFocus(payload.reviseCardFocus),
    initialArchitecture: clipArchitectureSnapshot(payload.initialArchitecture),
    reviseExpanded: clipReviseExpanded(payload.reviseExpanded),
    originalCard: payload.originalCard ? clipCard(payload.originalCard) : null,
    jobId: payload.jobId ? String(payload.jobId).slice(0, 200) : null,
    locked: Boolean(payload.locked),
    mode: clipDeskMode(payload.mode),
    reviseLocked: Boolean(payload.reviseLocked),
    revisePlanConfirmed: Boolean(payload.revisePlanConfirmed),
    lastRevision:
      payload.lastRevision && typeof payload.lastRevision === "object"
        ? payload.lastRevision
        : null,
    deployTarget: String(payload.deployTarget || "none").slice(0, 40),
    agentId: String(payload.agentId || "").slice(0, 80),
    validate: clipValidate(payload.validate),
    architecture: clipArchitecture(payload.architecture),
    architecturePrevious: clipArchitecturePrevious(payload.architecturePrevious),
    architectureMessages: clipMessages(payload.architectureMessages),
    dispatchPhase: payload.dispatchPhase === "done" ? "done" : null,
  };
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  return doc;
}
