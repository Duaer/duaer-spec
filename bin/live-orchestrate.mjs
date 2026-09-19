/**
 * Wave-based task orchestration helpers (pure; no fs).
 * Ready = all dependsOn present in the done set; waves are ready ∩ owned ∩ not done.
 */

function normId(id) {
  return String(id || "")
    .trim()
    .toUpperCase();
}

/**
 * @param {{ tasks?: Array<{ id?: string, done?: boolean }> } | null | undefined} progress
 * @returns {Set<string>}
 */
export function doneIdsFromProgress(progress) {
  const done = new Set();
  for (const t of progress?.tasks || []) {
    if (t?.done) {
      const id = normId(t.id);
      if (id) done.add(id);
    }
  }
  return done;
}

/**
 * @param {{ dependsOn?: string[] } | null | undefined} task
 * @param {Set<string>|Iterable<string>} doneSet
 */
export function isReady(task, doneSet) {
  const done =
    doneSet instanceof Set
      ? doneSet
      : new Set([...doneSet].map(normId).filter(Boolean));
  const deps = Array.isArray(task?.dependsOn) ? task.dependsOn : [];
  if (!deps.length) return true;
  return deps.every((d) => done.has(normId(d)));
}

/**
 * @param {{ tasks?: Array<object> } | null | undefined} pool
 * @param {Set<string>|Iterable<string>} doneSet
 */
export function readyTasks(pool, doneSet) {
  const done =
    doneSet instanceof Set
      ? doneSet
      : new Set([...doneSet].map(normId).filter(Boolean));
  return (pool?.tasks || []).filter(
    (t) => t && !done.has(normId(t.id)) && isReady(t, done),
  );
}

/**
 * @param {{ tasks?: Array<object> } | null | undefined} pool
 * @param {Set<string>|Iterable<string>} doneSet
 */
export function blockedTasks(pool, doneSet) {
  const done =
    doneSet instanceof Set
      ? doneSet
      : new Set([...doneSet].map(normId).filter(Boolean));
  return (pool?.tasks || []).filter(
    (t) => t && !done.has(normId(t.id)) && !isReady(t, done),
  );
}

/**
 * Ready ∩ owned by workerId ∩ not done.
 * @param {{ tasks?: Array<{ id?: string, workerId?: string, dependsOn?: string[] }> } | null | undefined} pool
 * @param {string} workerId
 * @param {Set<string>|Iterable<string>} doneSet
 */
export function waveForWorker(pool, workerId, doneSet) {
  const wid = String(workerId || "").trim();
  const done =
    doneSet instanceof Set
      ? doneSet
      : new Set([...doneSet].map(normId).filter(Boolean));
  return (pool?.tasks || []).filter((t) => {
    if (!t) return false;
    if (String(t.workerId || "").trim() !== wid) return false;
    if (done.has(normId(t.id))) return false;
    return isReady(t, done);
  });
}

/**
 * Stable fingerprint for a wave (sorted ids joined).
 * @param {Array<string|{id?: string}>} ids
 */
export function fingerprintWave(ids) {
  const list = (Array.isArray(ids) ? ids : [])
    .map((x) => (typeof x === "string" ? normId(x) : normId(x?.id)))
    .filter(Boolean);
  list.sort();
  return list.join(",");
}

/**
 * Summarize orchestration for status UI.
 * @param {{
 *   pool?: { tasks?: Array<object> } | null,
 *   doneSet?: Set<string>|Iterable<string>,
 *   workerCount?: number,
 *   releasedWaves?: Record<string, string[]>,
 * }} input
 */
export function orchestrationSummary(input = {}) {
  const done = doneIdsFromProgress({
    tasks: [...(input.doneSet || [])].map((id) => ({ id, done: true })),
  });
  // Prefer explicit doneSet when provided as Set of ids
  const doneSet =
    input.doneSet instanceof Set
      ? input.doneSet
      : Array.isArray(input.doneSet)
        ? new Set([...input.doneSet].map(normId))
        : done;
  const pool = input.pool || { tasks: [] };
  const ready = readyTasks(pool, doneSet);
  const blocked = blockedTasks(pool, doneSet);
  const released = input.releasedWaves || {};
  const releasedCount = Object.values(released).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
  return {
    readyCount: ready.length,
    blockedCount: blocked.length,
    releasedWaveCount: releasedCount,
    readyIds: ready.map((t) => t.id),
    blockedIds: blocked.map((t) => t.id),
  };
}

/**
 * Decide which workers need a new wave release.
 * Busy lanes still return reason "ready" — launchAgent FIFO-enqueues
 * continue behind the current session (silent-wait must not block forever).
 * @param {{
 *   pool: { tasks?: Array<object> },
 *   workerCount: number,
 *   doneSet: Set<string>|Iterable<string>,
 *   releasedWaves?: Record<string, string[]>,
 *   terminals?: Record<string, { busy?: boolean, queueDepth?: number }>,
 * }} input
 * @returns {Array<{ workerId: string, wave: object[], fingerprint: string, reason: string }>}
 */
export function pendingWaveReleases(input = {}) {
  const count = Math.max(1, Math.min(8, Number(input.workerCount) || 1));
  const doneSet =
    input.doneSet instanceof Set
      ? input.doneSet
      : new Set([...(input.doneSet || [])].map(normId).filter(Boolean));
  const released = input.releasedWaves || {};
  const out = [];
  for (let w = 1; w <= count; w += 1) {
    const workerId = `w${w}`;
    const wave = waveForWorker(input.pool, workerId, doneSet);
    if (!wave.length) continue;
    const fp = fingerprintWave(wave.map((t) => t.id));
    const prior = Array.isArray(released[workerId]) ? released[workerId] : [];
    if (prior.includes(fp)) continue;
    out.push({
      workerId,
      wave,
      fingerprint: fp,
      reason: "ready",
    });
  }
  return out;
}

/**
 * Orchestration lane state for a worker.
 * @param {{
 *   ownedTotal: number,
 *   ownedDone: number,
 *   readyCount: number,
 *   blockedOwned: number,
 *   terminal?: { busy?: boolean, queueDepth?: number },
 * }} input
 */
export function workerOrchestrationState(input = {}) {
  const ownedTotal = Number(input.ownedTotal) || 0;
  const ownedDone = Number(input.ownedDone) || 0;
  const readyCount = Number(input.readyCount) || 0;
  const blockedOwned = Number(input.blockedOwned) || 0;
  const term = input.terminal || {};
  if (ownedTotal > 0 && ownedDone >= ownedTotal) return "done";
  if (term.busy) return "running";
  if (Number(term.queueDepth) > 0) return "queued";
  if (readyCount > 0) return "waiting"; // ready but not yet launched / idle between waves
  if (blockedOwned > 0) return "waiting_deps";
  return "idle";
}
