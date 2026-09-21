/**
 * FDE-01 scope/acceptance baseline: fingerprint + clip helpers.
 */

export function emptyBaseline() {
  return {
    signedAt: null,
    signer: "",
    fingerprint: "",
    changes: [],
  };
}

/**
 * @param {unknown} raw
 */
export function clipBaseline(raw) {
  if (!raw || typeof raw !== "object") return emptyBaseline();
  const changes = Array.isArray(raw.changes)
    ? raw.changes
        .filter((c) => c && typeof c === "object")
        .map((c) => ({
          at: String(c.at || "").slice(0, 40),
          signer: String(c.signer || "").slice(0, 120),
          reason: String(c.reason || "").slice(0, 2000),
          fingerprint: String(c.fingerprint || "").slice(0, 16000),
        }))
        .filter((c) => c.reason)
        .slice(0, 40)
    : [];
  return {
    signedAt: raw.signedAt ? String(raw.signedAt).slice(0, 40) : null,
    signer: String(raw.signer || "").trim().slice(0, 120),
    fingerprint: String(raw.fingerprint || "").slice(0, 16000),
    changes,
  };
}

/**
 * Stable fingerprint of confirmed module cards (incl. baseline fields).
 * @param {Array<{ status?: string, id?: string, card?: object }>} modules
 */
export function baselineFingerprint(modules) {
  const list = Array.isArray(modules) ? modules : [];
  const confirmed = list
    .filter((m) => m && m.status === "confirmed")
    .map((m) => ({
      id: String(m.id || ""),
      goal: String(m.card?.goal || "").trim(),
      outOfScope: String(m.card?.outOfScope || "").trim(),
      acceptance: String(m.card?.acceptance || "").trim(),
      assumptions: String(m.card?.assumptions || "").trim(),
      deviceMatrix: String(m.card?.deviceMatrix || "").trim(),
      criticalPaths: String(m.card?.criticalPaths || "").trim(),
      exceptionCases: String(m.card?.exceptionCases || "").trim(),
      apiContract: String(m.card?.apiContract || "").trim(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(confirmed);
}

/**
 * @param {ReturnType<typeof clipBaseline>} baseline
 * @param {Array} modules
 */
export function baselineIsValid(baseline, modules) {
  const b = clipBaseline(baseline);
  if (!b.signedAt || !b.signer) return false;
  const fp = baselineFingerprint(modules);
  return Boolean(fp) && fp !== "[]" && b.fingerprint === fp;
}
