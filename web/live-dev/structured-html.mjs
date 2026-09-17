/**
 * Structured display for confirm / revise card fields.
 */

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const NUMBERED_RE = /^\s*(?:\d+[.)、]|[（(]\d+[）)]|[一二三四五六七八九十]+[、.）)])\s*(.*)$/;

/**
 * Turn common single-line LLM card text into newline / list form.
 * Keeps already-structured multiline text intact.
 */
export function normalizeReqText(text) {
  let s = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!s) return "";

  const hasNewlineList =
    /\n/.test(s) &&
    (/(?:^|\n)\s*[-*•]\s+\S/.test(s) ||
      /(?:^|\n)\s*(?:\d+[.)、]|[（(]\d+[）)])/.test(s));
  if (hasNewlineList) return s;

  // Inline numbered: "1、foo 2、bar" / "1. foo 2. bar" / "(1) foo (2) bar"
  if (
    !/\n/.test(s) &&
    /(?:^|\s)(?:\d+[.)、]|[（(]\d+[）)])\s*\S/.test(s) &&
    (s.match(/(?:^|\s)(?:\d+[.)、]|[（(]\d+[）)])\s*\S/g) || []).length >= 2
  ) {
    s = s
      .replace(/(?:^|\s)((?:\d+[.)、]|[（(]\d+[）)]))\s*/g, "\n$1 ")
      .trim();
    return s;
  }

  // Semicolon-separated clauses (typical checkable acceptance)
  if (!/\n/.test(s) && /[;；]/.test(s)) {
    const parts = s
      .split(/[;；]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/^[-*•]\s+/, ""));
    if (parts.length >= 2) {
      return parts.map((p) => `- ${p}`).join("\n");
    }
  }

  // Multiple short Chinese sentences in one line
  if (!/\n/.test(s) && (s.match(/。/g) || []).length >= 2) {
    const parts = s
      .split(/。/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => p.length <= 80)) {
      return parts.map((p) => `- ${p}`).join("\n");
    }
  }

  return s;
}

/** Render card field text as paragraphs / lists for the structured view. */
export function structuredHtml(text, emptyLabel) {
  const raw = normalizeReqText(text);
  if (!raw.trim()) {
    return `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
  }
  const lines = raw.split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const bullet = lines[i].match(BULLET_RE);
    const numbered = lines[i].match(NUMBERED_RE);
    if (bullet) {
      html += '<ul class="req-list">';
      while (i < lines.length) {
        const m = lines[i].match(BULLET_RE);
        if (!m) break;
        html += `<li class="req-item">${escapeHtml(m[1])}</li>`;
        i += 1;
      }
      html += "</ul>";
      continue;
    }
    if (numbered) {
      html += '<ol class="req-list req-list-num">';
      while (i < lines.length) {
        const m = lines[i].match(NUMBERED_RE);
        if (!m) break;
        html += `<li class="req-item">${escapeHtml(m[1])}</li>`;
        i += 1;
      }
      html += "</ol>";
      continue;
    }
    if (!lines[i].trim()) {
      i += 1;
      continue;
    }
    const parts = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) break;
      if (BULLET_RE.test(line) || NUMBERED_RE.test(line)) break;
      parts.push(escapeHtml(line.trim()));
      i += 1;
    }
    if (parts.length === 1) {
      html += `<p class="req-para">${parts[0]}</p>`;
    } else {
      html += `<p class="req-para">${parts.join("<br>")}</p>`;
    }
  }
  return html || `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
}
