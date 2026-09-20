/**
 * Desk SQLite: schema migrations + legacy JSON import.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DESK_SCHEMA_VERSION,
  closeDeskDb,
  importLegacyProjectChats,
  migrateDeskSchema,
  openDeskDb,
} from "../bin/live-desk-db.mjs";
import {
  projectChatKey,
  readProjectChat,
  writeProjectChat,
} from "../bin/live-project-chat.mjs";
import { DatabaseSync } from "node:sqlite";

test("desk schema migrates to DESK_SCHEMA_VERSION", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-desk-mig-"));
  try {
    const db = openDeskDb(root);
    const row = db
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get("schema_version");
    assert.equal(Number(row.value), DESK_SCHEMA_VERSION);
    closeDeskDb(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("legacy project-chats JSON is imported once without duplicate", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-desk-imp-"));
  const projectPath = path.join(root, "app");
  const key = projectChatKey(projectPath);
  const chatDir = path.join(root, "project-chats");
  fs.mkdirSync(chatDir, { recursive: true });
  fs.writeFileSync(
    path.join(chatDir, `${key}.json`),
    `${JSON.stringify({
      projectPath,
      updatedAt: "2026-01-01T00:00:00.000Z",
      messages: [{ role: "user", content: "legacy" }],
      card: {
        goal: "from json",
        outOfScope: "",
        acceptance: "ok",
        assumptions: "",
      },
    })}\n`,
    "utf8",
  );
  try {
    const first = openDeskDb(root);
    const session = readProjectChat(root, projectPath);
    assert.equal(session.card.goal, "from json");
    assert.equal(session.messages[0]?.content, "legacy");
    const again = importLegacyProjectChats(first, root);
    assert.equal(again.imported, 0);
    assert.ok(fs.existsSync(path.join(chatDir, `${key}.json`)));
    closeDeskDb(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("write/read project desk session uses sqlite file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-desk-rw-"));
  const projectPath = path.join(root, "app");
  try {
    writeProjectChat(root, {
      projectPath,
      messages: [{ role: "user", content: "hello" }],
      card: {
        goal: "Ship",
        outOfScope: "",
        acceptance: "done",
        assumptions: "",
      },
      jobId: "001-x",
    });
    assert.ok(fs.existsSync(path.join(root, "desk.sqlite")));
    closeDeskDb(root);
    const loaded = readProjectChat(root, projectPath);
    assert.equal(loaded.jobId, "001-x");
    assert.equal(loaded.card.goal, "Ship");
    assert.equal(loaded.messages[0]?.content, "hello");
  } finally {
    closeDeskDb(root);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("migrateDeskSchema is a no-op when already current", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-desk-noop-"));
  try {
    const db = openDeskDb(root);
    migrateDeskSchema(db);
    const row = db
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get("schema_version");
    assert.equal(Number(row.value), DESK_SCHEMA_VERSION);
    closeDeskDb(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("future migration slot can bump schema_version", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-desk-future-"));
  try {
    const dbPath = path.join(root, "desk.sqlite");
    const db = new DatabaseSync(dbPath);
    db.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE project_sessions (
        path_key TEXT PRIMARY KEY NOT NULL,
        project_path TEXT NOT NULL,
        updated_at TEXT,
        payload TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO meta(key, value) VALUES(?, ?)").run(
      "schema_version",
      "1",
    );
    db.close();
    const opened = openDeskDb(root);
    const row = opened
      .prepare("SELECT value FROM meta WHERE key = ?")
      .get("schema_version");
    assert.equal(Number(row.value), DESK_SCHEMA_VERSION);
    closeDeskDb(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
