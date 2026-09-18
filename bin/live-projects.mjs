/**
 * Project-first desk helpers: group live jobs under product paths (file store).
 */

import { basename } from "node:path";

/**
 * @param {string | null | undefined} p
 */
export function normalizeProjectKey(p) {
  const s = String(p || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!s) return "";
  try {
    // Avoid importing path.resolve here for testability of pure keys;
    // callers should pass absolute paths when possible.
    return s;
  } catch {
    return s;
  }
}

/**
 * Build project rows from remembered repos + jobs.
 * @param {{
 *   repos?: Array<{ path?: string, name?: string, title?: string, description?: string, lastUsedAt?: string }>,
 *   jobs?: Array<{ id: string, repoPath?: string|null, goal?: string, status?: string, at?: string|null }>,
 *   activeProjectPath?: string,
 * }} input
 */
export function buildProjectList(input = {}) {
  const repos = Array.isArray(input.repos) ? input.repos : [];
  const jobs = Array.isArray(input.jobs) ? input.jobs : [];
  const active = normalizeProjectKey(input.activeProjectPath);

  /** @type {Map<string, { path: string, name: string, title: string, description: string, lastUsedAt: string|null, jobs: typeof jobs }>} */
  const map = new Map();

  function ensure(pathRaw, meta = {}) {
    const key = normalizeProjectKey(pathRaw);
    if (!key) return null;
    const titleHint = String(meta.title || meta.name || "").trim();
    const descHint = String(meta.description || "").trim();
    const lastUsedAt = meta.lastUsedAt || null;
    let row = map.get(key);
    if (!row) {
      row = {
        path: key,
        name: titleHint || basename(key) || key,
        title: titleHint || basename(key) || key,
        description: descHint,
        lastUsedAt: lastUsedAt || null,
        jobs: [],
      };
      map.set(key, row);
    } else {
      if (titleHint) {
        row.title = titleHint;
        row.name = titleHint;
      }
      if (descHint) row.description = descHint;
      if (lastUsedAt && (!row.lastUsedAt || lastUsedAt > row.lastUsedAt)) {
        row.lastUsedAt = lastUsedAt;
      }
    }
    return row;
  }

  for (const r of repos) {
    if (!r?.path) continue;
    ensure(r.path, {
      title: r.title || r.name,
      name: r.name,
      description: r.description,
      lastUsedAt: r.lastUsedAt || null,
    });
  }

  const unassigned = [];
  for (const job of jobs) {
    const key = normalizeProjectKey(job.repoPath);
    if (!key) {
      unassigned.push(job);
      continue;
    }
    const row = ensure(key, { lastUsedAt: job.at || null });
    if (row) row.jobs.push(job);
  }

  const projects = [...map.values()].sort((a, b) => {
    if (active && a.path === active) return -1;
    if (active && b.path === active) return 1;
    const ta = Date.parse(a.lastUsedAt || "") || 0;
    const tb = Date.parse(b.lastUsedAt || "") || 0;
    if (tb !== ta) return tb - ta;
    return String(a.title || a.name).localeCompare(String(b.title || b.name));
  });

  for (const p of projects) {
    p.jobs.sort((a, b) => {
      const ta = Date.parse(a.at || "") || 0;
      const tb = Date.parse(b.at || "") || 0;
      return tb - ta;
    });
  }

  return {
    projects,
    unassigned,
    activeProjectPath: active || null,
  };
}
