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

function emptySession(projectPath = "") {
  return {
    projectPath: String(projectPath || "").trim(),
    updatedAt: null,
    messages: [],
    reviseMessages: [],
    rawAsk: "",
    card: clipCard(null),
    reviseCard: clipCard(null),
    originalCard: null,
    jobId: null,
    locked: false,
    mode: "specify",
    reviseLocked: false,
    lastRevision: null,
    deployTarget: "none",
    agentId: "",
    validate: clipValidate(null),
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
      originalCard: raw.originalCard ? clipCard(raw.originalCard) : null,
      jobId: raw.jobId ? String(raw.jobId).slice(0, 200) : null,
      locked: Boolean(raw.locked),
      mode: raw.mode === "revise" ? "revise" : "specify",
      reviseLocked: Boolean(raw.reviseLocked),
      lastRevision:
        raw.lastRevision && typeof raw.lastRevision === "object"
          ? raw.lastRevision
          : null,
      deployTarget: String(raw.deployTarget || "none").slice(0, 40),
      agentId: String(raw.agentId || "").slice(0, 80),
      validate: clipValidate(raw.validate),
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
    originalCard: payload.originalCard ? clipCard(payload.originalCard) : null,
    jobId: payload.jobId ? String(payload.jobId).slice(0, 200) : null,
    locked: Boolean(payload.locked),
    mode: payload.mode === "revise" ? "revise" : "specify",
    reviseLocked: Boolean(payload.reviseLocked),
    lastRevision:
      payload.lastRevision && typeof payload.lastRevision === "object"
        ? payload.lastRevision
        : null,
    deployTarget: String(payload.deployTarget || "none").slice(0, 40),
    agentId: String(payload.agentId || "").slice(0, 80),
    validate: clipValidate(payload.validate),
  };
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  return doc;
}
