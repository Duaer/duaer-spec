/**
 * Ensure discrete chat choices become clickable option chips.
 */

/** @param {unknown} options */
export function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of options) {
    const s = String(raw ?? "")
      .replace(/^[\s]*[-*•]\s+/, "")
      .replace(/^\s*(?:\d+[.)、]|[A-Da-d][.)、]|[（(]\d+[）)])\s*/, "")
      .trim();
    if (s.length < 1 || s.length > 48) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * Pull choice lines from assistant prose when JSON `options` is empty.
 * @param {string} reply
 * @param {unknown} [existing]
 */
export function enrichChatOptions(reply, existing) {
  const fromJson = normalizeOptions(existing);
  if (fromJson.length >= 2) return fromJson;

  const text = String(reply || "").replace(/\r\n/g, "\n");
  const found = [];
  const seen = new Set();
  for (const line of text.split("\n")) {
    const m = line.match(
      /^\s*(?:[-*•]|(?:\d+[.)、])|(?:[A-Da-d][.)、])|(?:[（(]\d+[）)]))\s+(.+?)\s*$/,
    );
    if (!m) continue;
    const s = m[1].replace(/[。.;；]+$/g, "").trim();
    if (s.length < 2 || s.length > 48) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(s);
  }
  if (found.length >= 2) return found.slice(0, 6);

  const quotedOr = text.match(
    /[「""「]([^」""」]{1,32})[」""」]\s*(?:还是|或|\/|or)\s*[「""「]([^」""」]{1,32})[」""」]/i,
  );
  if (quotedOr) {
    return normalizeOptions([quotedOr[1], quotedOr[2]]);
  }

  return fromJson;
}
