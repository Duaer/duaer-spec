/**
 * FDE desk SQLite: project sessions + schema migrations + legacy JSON import.
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { projectChatKey } from "./live-project-chat-key.mjs";

/** Bump when adding a migration in MIGRATIONS. */
export const DESK_SCHEMA_VERSION = 1;

const openDbs = new Map();

/**
 * Ordered migrations. Index 0 unused; version N is MIGRATIONS[N].
 * Each fn receives DatabaseSync and must be idempotent enough to run once.
 */
const MIGRATIONS = [
  null,
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_sessions (
        path_key TEXT PRIMARY KEY NOT NULL,
        project_path TEXT NOT NULL,
        updated_at TEXT,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_project_sessions_updated
        ON project_sessions(updated_at);
    `);
  },
];

function deskDbPath(liveRoot) {
  return path.join(String(liveRoot || ""), "desk.sqlite");
}

function readMeta(db, key) {
  const row = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(String(key));
  return row ? String(row.value) : null;
}

function writeMeta(db, key, value) {
  db.prepare(
    `INSERT INTO meta(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(key), String(value));
}

function currentSchemaVersion(db) {
  try {
    const v = Number(readMeta(db, "schema_version") || 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

/**
 * Apply migrations from current schema_version to DESK_SCHEMA_VERSION.
 * @param {import("node:sqlite").DatabaseSync} db
 */
export function migrateDeskSchema(db) {
  // Bootstrap meta table so we can read schema_version on a brand-new file.
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  let ver = currentSchemaVersion(db);
  while (ver < DESK_SCHEMA_VERSION) {
    const next = ver + 1;
    const step = MIGRATIONS[next];
    if (typeof step !== "function") {
      throw new Error(`missing desk migration for schema ${next}`);
    }
    const tx = db.prepare("BEGIN IMMEDIATE");
    tx.run();
    try {
      step(db);
      writeMeta(db, "schema_version", String(next));
      db.prepare("COMMIT").run();
      ver = next;
    } catch (err) {
      try {
        db.prepare("ROLLBACK").run();
      } catch {
        // ignore
      }
      throw err;
    }
  }
}

/**
 * Import ~/.duaer/live/project-chats/*.json that are not already in the DB.
 * Leaves JSON on disk. Safe to call on every open.
 * @param {import("node:sqlite").DatabaseSync} db
 * @param {string} liveRoot
 * @returns {{ imported: number, skipped: number }}
 */
export function importLegacyProjectChats(db, liveRoot) {
  const dir = path.join(String(liveRoot || ""), "project-chats");
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { imported: 0, skipped: 0 };
  }
  let imported = 0;
  let skipped = 0;
  const insert = db.prepare(
    `INSERT INTO project_sessions(path_key, project_path, updated_at, payload)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(path_key) DO NOTHING`,
  );
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  for (const name of names) {
    const file = path.join(dir, name);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      skipped += 1;
      continue;
    }
    const projectPath = String(raw.projectPath || "").trim();
    const key =
      projectChatKey(projectPath) ||
      String(name).replace(/\.json$/i, "").slice(0, 64);
    if (!key) {
      skipped += 1;
      continue;
    }
    const updatedAt = raw.updatedAt || null;
    const payload = JSON.stringify(raw);
    const info = insert.run(key, projectPath || key, updatedAt, payload);
    if (Number(info.changes) > 0) imported += 1;
    else skipped += 1;
  }
  writeMeta(db, "legacy_json_import", "v1");
  return { imported, skipped };
}

/**
 * Open (or reuse) the desk database for a live root.
 * Runs schema migrations and legacy JSON import.
 * @param {string} liveRoot
 */
export function openDeskDb(liveRoot) {
  const root = path.resolve(String(liveRoot || ""));
  if (!root) throw new Error("liveRoot required");
  const cached = openDbs.get(root);
  if (cached) return cached;
  fs.mkdirSync(root, { recursive: true });
  const db = new DatabaseSync(deskDbPath(root));
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
  } catch {
    // ignore pragma failures on exotic builds
  }
  migrateDeskSchema(db);
  importLegacyProjectChats(db, root);
  openDbs.set(root, db);
  return db;
}

/** Test helper: drop cached handle (does not delete the file). */
export function closeDeskDb(liveRoot) {
  const root = path.resolve(String(liveRoot || ""));
  const db = openDbs.get(root);
  if (!db) return;
  openDbs.delete(root);
  try {
    db.close();
  } catch {
    // ignore
  }
}

/**
 * @param {string} liveRoot
 * @param {string} projectPath
 * @returns {object|null}
 */
export function loadSessionPayload(liveRoot, projectPath) {
  const key = projectChatKey(projectPath);
  if (!key) return null;
  const db = openDeskDb(liveRoot);
  const row = db
    .prepare(
      "SELECT payload FROM project_sessions WHERE path_key = ? LIMIT 1",
    )
    .get(key);
  if (!row?.payload) return null;
  try {
    return JSON.parse(String(row.payload));
  } catch {
    return null;
  }
}

/**
 * @param {string} liveRoot
 * @param {object} doc clipped session document
 */
export function saveSessionPayload(liveRoot, doc) {
  const projectPath = String(doc?.projectPath || "").trim();
  const key = projectChatKey(projectPath);
  if (!key) {
    const e = new Error("projectPath required");
    e.code = "EMPTY_PATH";
    throw e;
  }
  const db = openDeskDb(liveRoot);
  const updatedAt = doc.updatedAt || new Date().toISOString();
  const payload = JSON.stringify(doc);
  db.prepare(
    `INSERT INTO project_sessions(path_key, project_path, updated_at, payload)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(path_key) DO UPDATE SET
       project_path = excluded.project_path,
       updated_at = excluded.updated_at,
       payload = excluded.payload`,
  ).run(key, projectPath, updatedAt, payload);
}
