/**
 * FDE-02 API contract declaration helpers.
 */

export function clipApiContract(raw) {
  return String(raw || "").trim().slice(0, 4000);
}

/** Explicit opt-out: module has no HTTP API surface. */
export function apiContractDeclaresNoHttp(text) {
  const t = clipApiContract(text);
  if (!t) return false;
  return /本模块无\s*HTTP\s*API|无\s*HTTP\s*API|无对外接口|不涉及接口|no\s*http\s*api|no\s*api|none|n\/a/i.test(
    t,
  );
}

export function apiContractIsFilled(text) {
  return clipApiContract(text).length >= 4;
}

/**
 * True when at least one confirmed module declares a real contract path
 * (not an opt-out).
 * @param {Array<{ status?: string, card?: { apiContract?: string } }>} modules
 */
export function modulesNeedApiContractTasks(modules) {
  const list = Array.isArray(modules) ? modules : [];
  return list.some((m) => {
    if (!m || m.status !== "confirmed") return false;
    const c = clipApiContract(m.card?.apiContract);
    return apiContractIsFilled(c) && !apiContractDeclaresNoHttp(c);
  });
}

/**
 * Short refs for task titles.
 * @param {Array<{ status?: string, title?: string, card?: { apiContract?: string } }>} modules
 */
export function apiContractRefs(modules) {
  const list = Array.isArray(modules) ? modules : [];
  const refs = [];
  for (const m of list) {
    if (!m || m.status !== "confirmed") continue;
    const c = clipApiContract(m.card?.apiContract);
    if (!apiContractIsFilled(c) || apiContractDeclaresNoHttp(c)) continue;
    refs.push(`${m.title || m.id}: ${c}`);
  }
  return refs.slice(0, 8);
}
