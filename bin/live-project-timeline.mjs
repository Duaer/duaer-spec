/**
 * Unified project timeline: initial requirements, revisions, and defects.
 * Sorted by time so everything "goes downward" chronologically.
 */

/**
 * @param {unknown} at
 * @returns {number|null}
 */
export function timelineAtMs(at) {
  if (!at) return null;
  const t = Date.parse(String(at));
  return Number.isFinite(t) ? t : null;
}

/**
 * @param {Array<{ at?: string|null, kind?: string, revision?: number, id?: string }>} entries
 */
export function sortTimelineEntries(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  const kindRank = (k) =>
    k === "initial" ? 0 : k === "revise" ? 1 : k === "bug" ? 2 : 3;
  list.sort((a, b) => {
    const ta = timelineAtMs(a?.at);
    const tb = timelineAtMs(b?.at);
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    if (ta != null && tb == null) return -1;
    if (ta == null && tb != null) return 1;
    const kr = kindRank(a?.kind) - kindRank(b?.kind);
    if (kr) return kr;
    const ra = Number(a?.revision) || 0;
    const rb = Number(b?.revision) || 0;
    if (ra !== rb) return ra - rb;
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
  return list;
}

/**
 * @param {(key: string, vars?: Record<string, string|number>) => string} pick
 *   pick(en, ja, zh) style via wrapper — we pass a small helper from deliverables.
 * @param {{
 *   modules?: object[],
 *   allReq?: boolean,
 *   confirmed?: object[],
 *   reviseCards?: object[],
 *   bugCards?: object[],
 *   updatedAt?: string|null,
 * }} session
 * @param {{
 *   initial: string,
 *   revise: (n: number) => string,
 *   bug: (n: number) => string,
 * }} labels
 */
export function buildProjectTimelineVersions(session, labels) {
  const s = session && typeof session === "object" ? session : {};
  const modules = Array.isArray(s.modules) ? s.modules : [];
  const confirmed = Array.isArray(s.confirmed)
    ? s.confirmed
    : modules.filter((m) => m?.status === "confirmed");
  const allReq = Boolean(s.allReq);
  const reviseCards = Array.isArray(s.reviseCards) ? s.reviseCards : [];
  const bugCards = Array.isArray(s.bugCards) ? s.bugCards : [];
  const entries = [];

  if (allReq || confirmed.length) {
    entries.push({
      id: "v0",
      kind: "initial",
      revision: 0,
      label: labels.initial,
      at: s.initialAt || s.updatedAt || null,
      modules: (allReq ? modules : confirmed).map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        card: m.card || {},
      })),
    });
  }

  for (const entry of reviseCards) {
    const rev = Number(entry?.revision) || 0;
    if (rev < 1) continue;
    entries.push({
      id: `r${rev}`,
      kind: "revise",
      revision: rev,
      label: labels.revise(rev),
      at: entry.at || null,
      revise: {
        goal: entry.goal || "",
        outOfScope: entry.outOfScope || "",
        acceptance: entry.acceptance || "",
        assumptions: entry.assumptions || "",
      },
    });
  }

  let bugIdx = 0;
  for (const entry of bugCards) {
    bugIdx += 1;
    const n = Number(entry?.seq) || bugIdx;
    entries.push({
      id: entry?.id ? String(entry.id) : `bug-${n}`,
      kind: "bug",
      revision: n,
      label: labels.bug(n),
      at: entry.at || null,
      bug: {
        goal: entry.goal || "",
        outOfScope: entry.outOfScope || "",
        acceptance: entry.acceptance || "",
        assumptions: entry.assumptions || "",
      },
    });
  }

  return sortTimelineEntries(entries);
}
