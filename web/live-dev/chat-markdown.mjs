/**
 * Safe, lightweight Markdown for live-desk chat bubbles.
 * Escape first, then allow a small inline subset only.
 */

import { escapeHtml } from "./structured-html.mjs";

/**
 * Trim trailing punctuation commonly stuck to pasted URLs.
 * @param {string} url
 * @returns {{ href: string, trail: string }}
 */
function splitUrlTrail(url) {
  const raw = String(url || "");
  const clean = raw.replace(/[.,;:!?）】」』》\]]+$/g, "");
  return { href: clean, trail: raw.slice(clean.length) };
}

/**
 * @param {string} text
 * @returns {string} HTML safe for bubble innerHTML
 */
export function renderChatMarkdown(text) {
  const raw = String(text ?? "");
  if (!raw) return "";

  // Escape, then restore intentional newlines as <br>
  let html = escapeHtml(raw);

  // Fenced code blocks ```...``` (before inline)
  html = html.replace(/```([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="chat-code"><code>${String(code).replace(/^\n|\n$/g, "")}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`\n]+)`/g, (_m, code) => {
    return `<code class="chat-inline-code">${code}</code>`;
  });

  // Links [label](https://...|/api/...) — http(s) or same-origin API paths
  html = html.replace(
    /\[([^\n\]]{1,200})\]\((https?:\/\/[^\s)<]{1,500}|\/api\/[^\s)<]{1,500})\)/g,
    (_m, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );

  // Bare http(s) URLs (skip ones already inside href="...")
  html = html.replace(
    /(^|[^"'>=])(https?:\/\/[^\s<]+)/g,
    (_m, pre, url) => {
      const { href, trail } = splitUrlTrail(url);
      if (!href) return _m;
      return `${pre}<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>${trail}`;
    },
  );

  // Bare /api/artifact|result/... paths (desk-served previews)
  html = html.replace(
    /(^|[^"'>=])(\/api\/(?:artifact|result)\/[^\s<]+)/g,
    (_m, pre, url) => {
      const { href, trail } = splitUrlTrail(url);
      if (!href) return _m;
      return `${pre}<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>${trail}`;
    },
  );

  // Bold **...** or __...__
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic *...* or _..._ (avoid matching inside words for underscore)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<![A-Za-z0-9_])_([^_\n]+)_(?![A-Za-z0-9_])/g, "<em>$1</em>");

  // Newlines → <br> (skip those already inside <pre>)
  const parts = html.split(/(<pre class="chat-code">[\s\S]*?<\/pre>)/g);
  html = parts
    .map((part) =>
      part.startsWith('<pre class="chat-code">')
        ? part
        : part.replace(/\n/g, "<br>"),
    )
    .join("");

  return html;
}
