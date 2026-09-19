/**
 * Project-first desk helpers: group live jobs under product paths (file store).
 */

import { basename } from "node:path";
import { deriveProjectDeliveryStatus } from "../web/live-dev/delivery-status.mjs";

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
 * Attach deliveryStatus / nextAction / hasDeliverables from a session reader.
 * @param {ReturnType<typeof buildProjectList>} bag
 * @param {(projectPath: string) => object|null|undefined} readSession
 */
export function enrichProjectsWithDeliveryStatus(bag, readSession) {
  const projects = Array.isArray(bag?.projects) ? bag.projects : [];
  for (const p of projects) {
    let session = null;
    try {
      session = typeof readSession === "function" ? readSession(p.path) : null;
    } catch {
      session = null;
    }
    const latestJob = Array.isArray(p.jobs) && p.jobs.length ? p.jobs[0] : null;
    const derived = deriveProjectDeliveryStatus(session, {
      jobStatus: latestJob?.status || null,
      deliveryAccepted:
        String(latestJob?.status || "").toLowerCase() === "accepted",
    });
    p.deliveryStatus = derived.status;
    p.nextAction = derived.nextAction;
    p.hasDeliverables = derived.hasDeliverables;
    p.stageSummary = derived.stages;
  }
  return bag;
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

  /** @type {Map<string, object>} */
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
        deliveryStatus: "drafting",
        nextAction: "chat",
        hasDeliverables: false,
        stageSummary: [],
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
