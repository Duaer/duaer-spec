/**
 * Split Acceptance / revision acceptance into discrete, independently
 * verifiable clauses. Shared by kickoff task pool and preview task graph.
 *
 * Breaks on newlines, `;` / `；`, inline numbered items, and sentence
 * boundaries (。！？ and `.` `!` `?`). A single remaining sentence stays one
 * clause. URLs, versions, and common abbreviations are not split.
 */

export function truncateText(s, max = 100) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

const NONE_RE = /^\(?none\)?$/i;

const MASK_RE =
  /https?:\/\/[^\s。！？!?]+|(?:\b(?:e\.g|i\.e|Mr|Mrs|Ms|Dr|vs|etc)\.)|(?:[A-Z]\.){2,}|\b\d+\.\d+(?:\.\d+)*\b/g;

const SENTENCE_RE = /(?<=[。！？])\s*|(?<=[!?])\s+|(?<=\.)\s+/;

function polishClause(bit, spans) {
  let text = String(bit || "").replace(
    /\u0000(\d+)\u0000/g,
    (_, i) => spans[Number(i)] ?? "",
  );
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/[。！？!?]+$/u, "").replace(/\.$/, "").trim();
  if (!text || text === "-" || NONE_RE.test(text)) return "";
  return text;
}

/** Further split one cleaned line into sentences or inline numbered items. */
function splitClauseFurther(line) {
  const spans = [];
  const masked = line.replace(MASK_RE, (m) => {
    const token = `\u0000${spans.length}\u0000`;
    spans.push(m);
    return token;
  });
  let pieces = [masked];
  if (/^\s*\d+[.)、]\s+/.test(masked)) {
    const marks = masked.match(/(?:^|\s)\d+[.)、]\s+/g) || [];
    if (marks.length >= 2) {
      pieces = masked
        .split(/(?=(?:^|\s)\d+[.)、]\s+)/)
        .map((p) => p.replace(/^\s*\d+[.)、]\s+/, "").trim())
        .filter(Boolean);
    } else {
      pieces = [masked.replace(/^\s*\d+[.)、]\s+/, "").trim()].filter(Boolean);
    }
  }
  const out = [];
  for (const piece of pieces) {
    for (const bit of piece.split(SENTENCE_RE)) {
      const polished = polishClause(bit, spans);
      if (polished) out.push(polished);
    }
  }
  return out;
}

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^[-*•]\s+/, "")
    .trim();
}

/** Split Acceptance / revision text into discrete clauses. */
export function splitAcceptanceLines(acceptance) {
  const raw = String(acceptance || "").trim();
  if (!raw || NONE_RE.test(raw)) return [];
  let lines = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t === "-" || NONE_RE.test(t)) continue;
    const cleaned = cleanLine(t);
    if (cleaned && !NONE_RE.test(cleaned)) lines.push(cleaned);
  }
  if (lines.length <= 1) {
    const parts = raw
      .split(/[;；]/)
      .map((p) => cleanLine(p))
      .filter((p) => p && !NONE_RE.test(p));
    if (parts.length > 1) lines = parts;
  }
  const atoms = [];
  for (const line of lines) {
    const bits = splitClauseFurther(line);
    if (bits.length) atoms.push(...bits);
    else atoms.push(line);
  }
  return atoms;
}

/**
 * Acceptance clauses, or goal/change sentences when acceptance is empty.
 * @param {string} acceptance
 * @param {string} [fallback]
 */
export function acceptanceAtoms(acceptance, fallback = "") {
  const primary = splitAcceptanceLines(acceptance);
  if (primary.length) return primary;
  return splitAcceptanceLines(fallback);
}
