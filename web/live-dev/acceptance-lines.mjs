/**
 * Split Acceptance / revision acceptance into discrete, independently
 * verifiable lines. Shared by kickoff task pool and preview task graph.
 */

export function truncateText(s, max = 100) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

/** Split Acceptance / revision acceptance into discrete lines. */
export function splitAcceptanceLines(acceptance) {
  const raw = String(acceptance || "").trim();
  if (!raw) return [];
  const lines = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t === "-" || /^\(?none\)?$/i.test(t)) continue;
    const cleaned = t
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)、]\s+/, "")
      .trim();
    if (cleaned) lines.push(cleaned);
  }
  if (lines.length <= 1) {
    const parts = raw
      .split(/[;；]/)
      .map((p) =>
        p
          .replace(/^[-*•]\s+/, "")
          .replace(/^\d+[.)、]\s+/, "")
          .trim(),
      )
      .filter((p) => p && !/^\(?none\)?$/i.test(p));
    if (parts.length > 1) return parts;
  }
  return lines;
}
