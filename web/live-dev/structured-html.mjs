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
 * Split modular card fields that use `[模块名] body` markers.
 * @returns {{ title: string, body: string }[] | null}
 */
export function splitModuleSections(text) {
  const s = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!s) return null;

  // Prefer line-leading markers; fall back to inline chain starting at index 0
  let matches = [...s.matchAll(/(?:^|\n)\s*\[([^\[\]\n]{1,48})\]\s*/g)];
  if (matches.length < 2) {
    const inline = [...s.matchAll(/\[([^\[\]\n]{1,48})\]\s*/g)];
    if (inline.length >= 2 && inline[0].index === 0) {
      matches = inline;
    } else {
      return null;
    }
  }

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const title = String(matches[i][1] || "").trim();
    if (!title) continue;
    const bodyStart = matches[i].index + matches[i][0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index : s.length;
    sections.push({
      title,
      body: s.slice(bodyStart, bodyEnd).trim(),
    });
  }
  return sections.length >= 2 ? sections : null;
}

/**
 * Expand one line: numbered clauses, semicolon bullets, or short顿号 chips.
 */
function expandInlineLine(line) {
  let s = String(line || "").trim();
  if (!s) return "";

  const numberedMarker =
    /(?:^|[；;\s])(?:\d+[.)、]|[（(]\d+[）)])\s*\S/;
  if (
    numberedMarker.test(s) &&
    (s.match(/(?:^|[；;\s])(?:\d+[.)、]|[（(]\d+[）)])\s*\S/g) || [])
      .length >= 2
  ) {
    return s
      .replace(/[；;]\s*((?:\d+[.)、]|[（(]\d+[）)]))\s*/g, "\n$1 ")
      .replace(/(?:^|\s)((?:\d+[.)、]|[（(]\d+[）)]))\s*/g, "\n$1 ")
      .trim();
  }

  if (/[;；]/.test(s)) {
    const parts = s
      .split(/[;；]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => p.replace(/^[-*•]\s+/, ""));
    if (parts.length >= 2) {
      return parts.map((p) => `- ${p}`).join("\n");
    }
  }

  // Short顿号 / comma chip lists (out-of-scope style) — not narrative prose
  if (!/。/.test(s) && !/：/.test(s)) {
    const parts = s
      .split(/[、,，]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (
      parts.length >= 3 &&
      parts.every((p) => p.length <= 40) &&
      s.length <= 280
    ) {
      return parts.map((p) => `- ${p}`).join("\n");
    }
  }

  if ((s.match(/。/g) || []).length >= 2) {
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
 * Turn common LLM card text into newline / list form.
 * Expands inline numbered / semicolon / chip clauses on each line,
 * including when the field is already multiline (module rows).
 */
export function normalizeReqText(text) {
  const s = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!s) return "";

  return s
    .split("\n")
    .map((line) => expandInlineLine(line))
    .join("\n");
}

/**
 * Parse field text into editable blocks.
 * @returns {{ kind: 'ul' | 'ol' | 'para' | 'section', items?: string[], title?: string, blocks?: object[] }[]}
 */
export function parseReqBlocks(text) {
  const sections = splitModuleSections(text);
  if (sections) {
    return sections.map((sec) => ({
      kind: "section",
      title: sec.title,
      blocks: parseReqBlocksFlat(sec.body),
    }));
  }
  return parseReqBlocksFlat(text);
}

function parseReqBlocksFlat(text) {
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
 * @returns {{ mode: 'ul' | 'ol' | 'para', items: string[] }}
 */
export function reqEditModel(text) {
  const sections = splitModuleSections(text);
  if (sections) {
    // Keep module markers so round-trip edit preserves structure
    return {
      mode: "ul",
      items: sections.map((sec) => {
        const inner = normalizeReqText(sec.body).trim();
        return inner
          ? `[${sec.title}] ${inner.replace(/\n/g, " ")}`
          : `[${sec.title}]`;
      }),
    };
  }

  const blocks = parseReqBlocksFlat(text);
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
    if (items.length === 1) return { mode: "para", items };
    return { mode: "ul", items };
  }
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
  // Preserve `[模块] …` rows as separate lines for modular fields
  if (
    cleaned.length >= 2 &&
    cleaned.every((x) => /^\[[^\[\]]+\]/.test(x))
  ) {
    return cleaned.join("\n");
  }
  if (mode === "ol") {
    return cleaned.map((x, i) => `${i + 1}. ${x}`).join("\n");
  }
  if (mode === "para" && cleaned.length === 1) {
    return cleaned[0];
  }
  return cleaned.map((x) => `- ${x}`).join("\n");
}

function renderBlocksHtml(blocks, emptyLabel) {
  if (!blocks.length) {
    return `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
  }
  let html = "";
  for (const block of blocks) {
    if (block.kind === "section") {
      const inner = renderBlocksHtml(block.blocks || [], emptyLabel);
      html += `<section class="req-mod"><h4 class="req-mod-title">${escapeHtml(block.title)}</h4>${inner}</section>`;
      continue;
    }
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

/** Render card field text as paragraphs / lists for the structured view. */
export function structuredHtml(text, emptyLabel) {
  return renderBlocksHtml(parseReqBlocks(text), emptyLabel);
}
