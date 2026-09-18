/**
 * Pre-accept Claude Code workspace trust for FDE-dispatched worktrees.
 *
 * Claude Code gates first open with hasTrustDialogAccepted in
 * ~/.claude.json (or $CLAUDE_CONFIG_DIR/.claude.json). Cursor Agent already
 * gets --trust; Claude needs this stamp so Terminal is not blocked on
 * 「Yes, I trust this folder」 after the human clicked 派工.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function claudeJsonPath({
  env = process.env,
  homedir = os.homedir,
} = {}) {
  const dir = String(env.CLAUDE_CONFIG_DIR || "").trim();
  if (dir) return path.join(dir, ".claude.json");
  return path.join(homedir(), ".claude.json");
}

export function normalizeClaudeProjectKey(worktreePath) {
  return path
    .resolve(String(worktreePath || "").trim())
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

/**
 * Paths Claude may key on for a FDE worktree (cwd + product root + git toplevel).
 */
export function claudeTrustCandidatePaths(worktreePath) {
  const abs = normalizeClaudeProjectKey(worktreePath);
  if (!abs) return [];
  const keys = new Set([abs]);
  const slash = abs.replace(/\\/g, "/");
  const m = slash.match(/^(.*)\/\.worktree\/[^/]+$/);
  if (m?.[1]) keys.add(m[1]);
  try {
    const r = spawnSync(
      "git",
      ["-C", abs, "rev-parse", "--show-toplevel"],
      { encoding: "utf8", timeout: 5000 },
    );
    const top = String(r.stdout || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+$/, "");
    if (top && r.status === 0) keys.add(top);
  } catch {
    /* ignore */
  }
  return [...keys];
}

/**
 * Set projects[path].hasTrustDialogAccepted = true for FDE launch paths.
 * Preserves the rest of the Claude config file.
 *
 * @returns {{ ok: boolean, path?: string, keys?: string[], error?: string }}
 */
export function markClaudeWorkspacesTrusted(
  worktreePath,
  { env = process.env, homedir = os.homedir, readFileSync = fs.readFileSync, writeFileSync = fs.writeFileSync, mkdirSync = fs.mkdirSync, existsSync = fs.existsSync } = {},
) {
  const keys = claudeTrustCandidatePaths(worktreePath);
  if (!keys.length) {
    return { ok: false, error: "empty worktree path" };
  }
  const configPath = claudeJsonPath({ env, homedir });
  let config = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf8");
      config = JSON.parse(raw);
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        config = {};
      }
    } catch (err) {
      return {
        ok: false,
        path: configPath,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  if (!config.projects || typeof config.projects !== "object") {
    config.projects = {};
  }
  for (const key of keys) {
    const prev =
      config.projects[key] && typeof config.projects[key] === "object"
        ? config.projects[key]
        : {};
    config.projects[key] = { ...prev, hasTrustDialogAccepted: true };
  }
  try {
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  } catch (err) {
    return {
      ok: false,
      path: configPath,
      keys,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return { ok: true, path: configPath, keys };
}
