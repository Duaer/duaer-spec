/**
 * FDE desk SQLite: sessions, config, repos, jobs + schema migrations + legacy import.
 */

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { projectChatKey } from "./live-project-chat-key.mjs";

/** Bump when adding a migration in MIGRATIONS. */
export const DESK_SCHEMA_VERSION = 2;

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
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS desk_kv (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY NOT NULL,
        updated_at TEXT,
        files_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jobs_updated ON jobs(updated_at);
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

function kvGet(db, key) {
  const row = db
    .prepare("SELECT value FROM desk_kv WHERE key = ?")
    .get(String(key));
  return row ? String(row.value) : null;
}

function kvSet(db, key, value) {
  db.prepare(
    `INSERT INTO desk_kv(key, value) VALUES(?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(key), String(value));
}

/**
 * Import config.json / repos.json when desk_kv keys are empty.
 * @returns {{ config: boolean, repos: boolean }}
 */
export function importLegacyConfigRepos(db, liveRoot) {
  const root = String(liveRoot || "");
  let config = false;
  let repos = false;
  if (!kvGet(db, "config")) {
    const p = path.join(root, "config.json");
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf8");
        JSON.parse(raw);
        kvSet(db, "config", raw);
        config = true;
      } catch {
        // leave empty
      }
    }
  }
  if (!kvGet(db, "repos")) {
    const p = path.join(root, "repos.json");
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf8");
        JSON.parse(raw);
        kvSet(db, "repos", raw);
        repos = true;
      } catch {
        // leave empty
      }
    }
  }
  writeMeta(db, "legacy_kv_import", "v1");
  return { config, repos };
}

/**
 * Walk a job directory into a relpath → utf8 content map.
 * @param {string} jobDir
 * @returns {Record<string, string>}
 */
export function readJobDirFiles(jobDir) {
  const abs = path.resolve(String(jobDir || ""));
  const out = {};
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return out;

  function walk(dir, prefix) {
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === "." || name === "..") continue;
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!st.isFile()) continue;
      try {
        const buf = fs.readFileSync(full);
        if (buf.includes(0)) {
          out[rel] = `base64:${buf.toString("base64")}`;
        } else {
          out[rel] = buf.toString("utf8");
        }
      } catch {
        // skip
      }
    }
  }

  walk(abs, "");
  return out;
}

/**
 * Write a files map onto disk under jobDir (creates dirs).
 * @param {string} jobDir
 * @param {Record<string, string>} files
 */
export function materializeJobDir(jobDir, files) {
  const abs = path.resolve(String(jobDir || ""));
  fs.mkdirSync(abs, { recursive: true });
  const map = files && typeof files === "object" ? files : {};
  for (const [rel, content] of Object.entries(map)) {
    const safe = String(rel || "").replace(/^[/\\]+/, "").replace(/\0/g, "");
    if (!safe || safe.includes("..")) continue;
    const full = path.join(abs, safe);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const text = String(content ?? "");
    if (text.startsWith("base64:")) {
      fs.writeFileSync(full, Buffer.from(text.slice(7), "base64"));
    } else {
      fs.writeFileSync(full, text, "utf8");
    }
  }
}

/**
 * Import jobs/* directories not already in the DB.
 * @returns {{ imported: number, skipped: number }}
 */
export function importLegacyJobs(db, liveRoot) {
  const root = path.join(String(liveRoot || ""), "jobs");
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { imported: 0, skipped: 0 };
  }
  let imported = 0;
  let skipped = 0;
  const insert = db.prepare(
    `INSERT INTO jobs(id, updated_at, files_json) VALUES(?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  );
  let names = [];
  try {
    names = fs.readdirSync(root);
  } catch {
    return { imported: 0, skipped: 0 };
  }
  for (const id of names) {
    const dir = path.join(root, id);
    try {
      if (!fs.statSync(dir).isDirectory()) {
        skipped += 1;
        continue;
      }
    } catch {
      skipped += 1;
      continue;
    }
    const files = readJobDirFiles(dir);
    if (!files["job.json"]) {
      skipped += 1;
      continue;
    }
    let updatedAt = null;
    try {
      const job = JSON.parse(files["job.json"]);
      updatedAt =
        job.dispatch?.revisedAt ||
        job.revisedAt ||
        job.dispatch?.dispatchedAt ||
        job.confirmedAt ||
        null;
    } catch {
      updatedAt = null;
    }
    const info = insert.run(id, updatedAt, JSON.stringify(files));
    if (Number(info.changes) > 0) imported += 1;
    else skipped += 1;
  }
  writeMeta(db, "legacy_jobs_import", "v1");
  return { imported, skipped };
}

/**
 * Open (or reuse) the desk database for a live root.
 * Runs schema migrations and legacy imports.
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
  importLegacyConfigRepos(db, root);
  importLegacyJobs(db, root);
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

/** @returns {object|null} parsed config object */
export function loadDeskConfig(liveRoot) {
  const db = openDeskDb(liveRoot);
  const raw = kvGet(db, "config");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {object} cfg */
export function saveDeskConfig(liveRoot, cfg) {
  const db = openDeskDb(liveRoot);
  kvSet(db, "config", `${JSON.stringify(cfg, null, 2)}\n`);
}

/** @returns {{ repos: object[] }|null} */
export function loadDeskReposDoc(liveRoot) {
  const db = openDeskDb(liveRoot);
  const raw = kvGet(db, "repos");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {{ repos: object[] }} doc */
export function saveDeskReposDoc(liveRoot, doc) {
  const db = openDeskDb(liveRoot);
  kvSet(db, "repos", `${JSON.stringify(doc, null, 2)}\n`);
}

/**
 * Upsert a live job from a files map.
 * @param {string} liveRoot
 * @param {string} jobId
 * @param {Record<string, string>} files
 * @param {string|null} [updatedAt]
 */
export function saveJobFiles(liveRoot, jobId, files, updatedAt = null) {
  const id = String(jobId || "").trim();
  if (!id) throw new Error("jobId required");
  const db = openDeskDb(liveRoot);
  let at = updatedAt;
  if (!at) {
    try {
      const job = JSON.parse(String(files?.["job.json"] || "{}"));
      at =
        job.dispatch?.revisedAt ||
        job.revisedAt ||
        job.dispatch?.dispatchedAt ||
        job.confirmedAt ||
        new Date().toISOString();
    } catch {
      at = new Date().toISOString();
    }
  }
  db.prepare(
    `INSERT INTO jobs(id, updated_at, files_json) VALUES(?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       updated_at = excluded.updated_at,
       files_json = excluded.files_json`,
  ).run(id, at, JSON.stringify(files || {}));
}

/**
 * Snapshot a job directory into SQLite (and keep the directory).
 * @param {string} liveRoot
 * @param {string} jobId
 */
export function syncJobDirToDb(liveRoot, jobId) {
  const id = String(jobId || "").trim();
  if (!id) return;
  const dir = path.join(String(liveRoot || ""), "jobs", id);
  const files = readJobDirFiles(dir);
  if (!Object.keys(files).length) return;
  saveJobFiles(liveRoot, id, files);
}

/**
 * @param {string} liveRoot
 * @param {string} jobId
 * @returns {Record<string, string>|null}
 */
export function loadJobFiles(liveRoot, jobId) {
  const id = String(jobId || "").trim();
  if (!id) return null;
  const db = openDeskDb(liveRoot);
  const row = db
    .prepare("SELECT files_json FROM jobs WHERE id = ? LIMIT 1")
    .get(id);
  if (!row?.files_json) return null;
  try {
    const parsed = JSON.parse(String(row.files_json));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Ensure jobs/<id> exists on disk from SQLite (no-op if already present with job.json).
 * @param {string} liveRoot
 * @param {string} jobId
 * @returns {string} absolute job dir
 */
export function ensureJobDirMaterialized(liveRoot, jobId) {
  const id = String(jobId || "").trim();
  const dir = path.join(String(liveRoot || ""), "jobs", id);
  const jobJson = path.join(dir, "job.json");
  if (fs.existsSync(jobJson)) return dir;
  const files = loadJobFiles(liveRoot, id);
  if (files) materializeJobDir(dir, files);
  return dir;
}

/**
 * @param {string} liveRoot
 * @returns {Array<{ id: string, updatedAt: string|null, files: Record<string, string> }>}
 */
export function listJobsFromDb(liveRoot) {
  const db = openDeskDb(liveRoot);
  const rows = db
    .prepare("SELECT id, updated_at, files_json FROM jobs")
    .all();
  const out = [];
  for (const row of rows) {
    let files = {};
    try {
      files = JSON.parse(String(row.files_json || "{}")) || {};
    } catch {
      files = {};
    }
    out.push({
      id: String(row.id),
      updatedAt: row.updated_at || null,
      files,
    });
  }
  return out;
}
