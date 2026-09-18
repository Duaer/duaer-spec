/**
 * Persist per-project desk chat transcripts under ~/.duaer/live/project-chats/.
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

/**
 * @returns {{
 *   projectPath: string,
 *   updatedAt: string|null,
 *   messages: Array<{role:string,content:string}>,
 *   reviseMessages: Array<{role:string,content:string}>,
 *   rawAsk: string,
 * }}
 */
export function readProjectChat(liveRoot, projectPath) {
  const file = projectChatPath(liveRoot, projectPath);
  const empty = {
    projectPath: String(projectPath || "").trim(),
    updatedAt: null,
    messages: [],
    reviseMessages: [],
    rawAsk: "",
  };
  if (!file || !fs.existsSync(file)) return empty;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const messages = Array.isArray(raw.messages)
      ? raw.messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({
            role: m.role,
            content: String(m.content || "").slice(0, 20000),
          }))
          .slice(-200)
      : [];
    const reviseMessages = Array.isArray(raw.reviseMessages)
      ? raw.reviseMessages
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({
            role: m.role,
            content: String(m.content || "").slice(0, 20000),
          }))
          .slice(-200)
      : [];
    return {
      projectPath: String(raw.projectPath || projectPath || "").trim(),
      updatedAt: raw.updatedAt || null,
      messages,
      reviseMessages,
      rawAsk: String(raw.rawAsk || "").slice(0, 8000),
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
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: String(m.content || "").slice(0, 20000),
        }))
        .slice(-200)
    : [];
  const reviseMessages = Array.isArray(payload.reviseMessages)
    ? payload.reviseMessages
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: String(m.content || "").slice(0, 20000),
        }))
        .slice(-200)
    : [];
  const doc = {
    projectPath,
    updatedAt: new Date().toISOString(),
    messages,
    reviseMessages,
    rawAsk: String(payload.rawAsk || "").slice(0, 8000),
  };
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  return doc;
}
