/**
 * Structured display + edit helpers for confirm / revise card fields.
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

  // Inline numbered: "1、foo 2、bar" / "1) foo；2) bar" / "(1) foo (2) bar"
  const numberedMarker =
    /(?:^|[；;\s])(?:\d+[.)、]|[（(]\d+[）)])\s*\S/;
  if (
    !/\n/.test(s) &&
    numberedMarker.test(s) &&
    (s.match(/(?:^|[；;\s])(?:\d+[.)、]|[（(]\d+[）)])\s*\S/g) || [])
      .length >= 2
  ) {
    s = s
      .replace(/[；;]\s*((?:\d+[.)、]|[（(]\d+[）)]))\s*/g, "\n$1 ")
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

/**
 * Parse field text into editable blocks.
 * @returns {{ kind: 'ul' | 'ol' | 'para', items: string[] }[]}
 */
export function parseReqBlocks(text) {
  const raw = normalizeReqText(text);
  if (!raw.trim()) return [];

  const lines = raw.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const bullet = lines[i].match(BULLET_RE);
    const numbered = lines[i].match(NUMBERED_RE);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(BULLET_RE);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (numbered) {
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(NUMBERED_RE);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      blocks.push({ kind: "ol", items });
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
      parts.push(line.trim());
      i += 1;
    }
    if (parts.length) blocks.push({ kind: "para", items: parts });
  }
  return blocks;
}

/**
 * Flatten blocks into a single editable item list for the UI.
 * Lists stay bullets/numbers; plain paragraphs become one editable row each.
 * @returns {{ mode: 'ul' | 'ol' | 'para', items: string[] }}
 */
export function reqEditModel(text) {
  const blocks = parseReqBlocks(text);
  if (!blocks.length) return { mode: "ul", items: [""] };

  const kinds = new Set(blocks.map((b) => b.kind));
  if (kinds.size === 1 && kinds.has("ol")) {
    return {
      mode: "ol",
      items: blocks.flatMap((b) => b.items),
    };
  }
  if (kinds.size === 1 && kinds.has("ul")) {
    return {
      mode: "ul",
      items: blocks.flatMap((b) => b.items),
    };
  }
  if (kinds.size === 1 && kinds.has("para")) {
    const items = blocks.flatMap((b) => b.items);
    // Single short goal-style paragraph → one para row
    if (items.length === 1) return { mode: "para", items };
    // Multiple para lines → edit as bullets (clearer structure)
    return { mode: "ul", items };
  }
  // Mixed → prefer bullets
  return {
    mode: "ul",
    items: blocks.flatMap((b) => b.items),
  };
}

/** Serialize editor items back to card field text. */
export function serializeReqEdit(mode, items) {
  const list = (Array.isArray(items) ? items : [])
    .map((x) => String(x ?? "").trim())
    .filter((x, i, arr) => x || arr.length === 1);
  const cleaned = list.filter((x) => x);
  if (!cleaned.length) return "";
  if (mode === "ol") {
    return cleaned.map((x, i) => `${i + 1}. ${x}`).join("\n");
  }
  if (mode === "para" && cleaned.length === 1) {
    return cleaned[0];
  }
  return cleaned.map((x) => `- ${x}`).join("\n");
}

/** Render card field text as paragraphs / lists for the structured view. */
export function structuredHtml(text, emptyLabel) {
  const blocks = parseReqBlocks(text);
  if (!blocks.length) {
    return `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
  }
  let html = "";
  for (const block of blocks) {
    if (block.kind === "ul") {
      html += '<ul class="req-list">';
      for (const item of block.items) {
        html += `<li class="req-item">${escapeHtml(item)}</li>`;
      }
      html += "</ul>";
      continue;
    }
    if (block.kind === "ol") {
      html += '<ol class="req-list req-list-num">';
      for (const item of block.items) {
        html += `<li class="req-item">${escapeHtml(item)}</li>`;
      }
      html += "</ol>";
      continue;
    }
    if (block.items.length === 1) {
      html += `<p class="req-para">${escapeHtml(block.items[0])}</p>`;
    } else {
      html += `<p class="req-para">${block.items.map(escapeHtml).join("<br>")}</p>`;
    }
  }
  return html || `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
}
