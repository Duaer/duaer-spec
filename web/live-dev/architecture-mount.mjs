/**
 * Mount Archify architecture HTML into a page host (no iframe).
 * Full styles + viewer runtime (motion overlays) via Shadow DOM and a
 * document proxy scoped to `.archify-root`. Desk clicks open fullscreen
 * present view; embed node zoom is disabled.
 *
 * Must include the full <body> chrome (toolbar buttons etc.) — Archify's
 * viewer script null-derefs if #btn-preset / #btn-theme are missing.
 */

function architectureKeyFromUrl(url) {
  const raw = String(url || "");
  const m = raw.match(/\/api\/architecture\/([a-f0-9]+)\.html/i);
  return m ? m[1].toLowerCase() : "";
}

/**
 * Retarget document-level Archify selectors to the in-shadow root.
 * Avoid data-embed mode — it strips motion overlays / passport.
 */
function scopeArchifyCss(css) {
  let out = String(css || "")
    .replace(/:root\b/g, ".archify-root")
    .replace(/html\[/g, ".archify-root[")
    .replace(/\bhtml\b/g, ".archify-root")
    .replace(/\bbody\b/g, ".archify-root");
  for (let i = 0; i < 3; i += 1) {
    out = out.replace(
      /\.archify-root((?:\[[^\]]*\])*)\s+\.archify-root\b/g,
      ".archify-root$1",
    );
  }
  return out;
}

function hostChromeCss() {
  return `
:host {
  display: block;
  position: relative;
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  background: #020617;
  color: #e8eef7;
  overflow: visible !important;
}
:host([hidden]) { display: none !important; }
.archify-root {
  position: relative;
  width: 100%;
  /* Kill Archify reader viewport lock (body/html min-height:100vh, container 100dvh). */
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  background: var(--bg, #020617);
  color: var(--text, #e8eef7);
  overflow: visible !important;
  box-sizing: border-box;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
/* Desk: hide Archify chrome; keep diagram FX.
   DOM nodes stay present so the viewer script can bind them.
   focus-chip stays hidden — click opens fullscreen, not node passport. */
.archify-root .toolbar,
.archify-root .header,
.archify-root .cards,
.archify-root .diagram-nav,
.archify-root .overview-map,
.archify-root .route-probe,
.archify-root .semantic-lens,
.archify-root .diagram-guide,
.archify-root .node-finder,
.archify-root .guided-views,
.archify-root .share-chapter-cue,
.archify-root .export-wrap,
.archify-root .preset-wrap,
.archify-root .present-wrap {
  display: none !important;
}
.archify-root .container {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
}
.archify-root .diagram-container {
  display: block !important;
  flex: none !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  overflow: visible !important;
  position: relative !important;
  padding: 100px 0 28px 100px !important;
  box-sizing: border-box !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.archify-root .diagram-container svg {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  max-height: none !important;
}
.archify-root .focus-chip {
  display: none !important;
}
`;
}

function isJsonScript(el) {
  const type = String(el.getAttribute("type") || "").toLowerCase();
  if (type === "application/json") return true;
  const id = el.id || "";
  return (
    id === "archify-i18n-data" ||
    id === "archify-guided-views-data" ||
    id === "archify-source-evidence-data"
  );
}

function isViewerMainScript(el) {
  if (el.id === "duaer-embed-node-zoom") return false;
  const type = String(el.getAttribute("type") || "").toLowerCase();
  if (type && type !== "text/javascript" && type !== "module") return false;
  const body = el.textContent || "";
  return body.includes("var Archify") || /Archify\s*=\s*\{\}/.test(body);
}

function parseArchifyHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const theme =
    doc.documentElement.getAttribute("data-theme") ||
    doc.body?.getAttribute("data-theme") ||
    "dark";
  const preset =
    doc.documentElement.getAttribute("data-preset") ||
    doc.body?.getAttribute("data-preset") ||
    "classic";
  const lang = doc.documentElement.getAttribute("lang") || "en";

  /** @type {{ id: string, css: string }[]} */
  const styles = [];
  for (const el of doc.querySelectorAll("style")) {
    if (el.id === "duaer-embed-fit") continue;
    const css = String(el.textContent || "").trim();
    if (!css) continue;
    styles.push({ id: el.id || "", css });
  }

  if (!doc.querySelector(".container svg, .diagram-container svg, svg[viewBox]")) {
    throw new Error("architecture svg missing");
  }

  // Full body markup — toolbar + container + focus-chip + overlays.
  // Strip executable scripts (we re-run the viewer via new Function).
  const bodyClone = doc.body.cloneNode(true);
  for (const el of [...bodyClone.querySelectorAll("script")]) {
    if (isJsonScript(el)) continue;
    el.remove();
  }
  const bodyHtml = bodyClone.innerHTML;

  let main = "";
  for (const el of doc.querySelectorAll("script")) {
    if (isViewerMainScript(el)) {
      main = el.textContent || "";
      break;
    }
  }

  return { theme, preset, lang, styles, bodyHtml, main };
}

function createScopedDocument(rootEl, shadow) {
  const real = document;
  const scoped = {
    documentElement: rootEl,
    body: rootEl,
    head: shadow,
    getElementById: (id) => shadow.getElementById(id),
    querySelector: (sel) => {
      const s = String(sel || "");
      if (s === "html" || s === ":root" || s === "body") return rootEl;
      if (s.startsWith("html")) {
        try {
          return rootEl.matches(s.replace(/^html/, "*")) ? rootEl : null;
        } catch {
          return null;
        }
      }
      try {
        if (rootEl.matches?.(s)) return rootEl;
      } catch {
        /* invalid for Element.matches */
      }
      return shadow.querySelector(s);
    },
    querySelectorAll: (sel) => {
      const s = String(sel || "");
      if (s === "html" || s === ":root" || s === "body") return [rootEl];
      return shadow.querySelectorAll(s);
    },
    getElementsByClassName: (name) =>
      shadow.querySelectorAll(`.${CSS.escape(String(name))}`),
    getElementsByTagName: (tag) => {
      const t = String(tag || "*").toLowerCase();
      if (t === "html" || t === "body") return [rootEl];
      return shadow.querySelectorAll(t);
    },
    createElement: (...a) => real.createElement(...a),
    createElementNS: (...a) => real.createElementNS(...a),
    createTextNode: (...a) => real.createTextNode(...a),
    createComment: (...a) => real.createComment(...a),
    createDocumentFragment: () => real.createDocumentFragment(),
    createTreeWalker: (root, ...rest) =>
      real.createTreeWalker(root || rootEl, ...rest),
    createRange: () => real.createRange(),
    adoptNode: (n) => real.adoptNode(n),
    importNode: (n, deep) => real.importNode(n, deep),
    addEventListener: (...a) => rootEl.addEventListener(...a),
    removeEventListener: (...a) => rootEl.removeEventListener(...a),
    dispatchEvent: (...a) => rootEl.dispatchEvent(...a),
    hasFocus: () => shadow.activeElement != null,
    get activeElement() {
      return shadow.activeElement || rootEl;
    },
    get defaultView() {
      return window;
    },
    get location() {
      return real.location;
    },
    get visibilityState() {
      return real.visibilityState;
    },
    get hidden() {
      return real.hidden;
    },
  };

  return new Proxy(scoped, {
    get(target, prop) {
      if (prop in target) return target[prop];
      const v = real[prop];
      return typeof v === "function" ? v.bind(real) : v;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

/**
 * Desk mounts open fullscreen on click; do not zoom/enlarge nodes in-embed.
 * Keep Archify.view.reveal as a no-op so residual handlers cannot frame zoom.
 */
function disableEmbedNodeZoom(Archify) {
  if (!Archify?.view || typeof Archify.view.reveal !== "function") return;
  if (Archify.view.__duaerEmbedNoZoom) return;
  Archify.view.reveal = function duaerNoZoomReveal() {
    /* desk: click opens present fullscreen instead */
  };
  Archify.view.__duaerEmbedNoZoom = true;
}

function runViewerScript(code, scopedDocument) {
  if (!code) return null;
  const runner = new Function(
    "document",
    "window",
    `"use strict";\n${code}\n;return typeof Archify !== "undefined" ? Archify : null;`,
  );
  const Archify = runner(scopedDocument, window);
  disableEmbedNodeZoom(Archify);
  return Archify;
}

/**
 * @param {HTMLElement} host
 * @param {{ url: string, ir?: object|null }} opts
 */
export async function mountArchitectureDiagram(host, opts = {}) {
  if (!host) return false;
  const url = String(opts.url || host.dataset.archUrl || "").trim();
  if (!url) {
    clearArchitectureMount(host);
    return false;
  }
  const key = architectureKeyFromUrl(url);
  if (!key) {
    host.hidden = true;
    return false;
  }

  if (
    host.dataset.archKey === key &&
    host.shadowRoot?.querySelector(".archify-root svg") &&
    host._archify
  ) {
    host.hidden = false;
    return true;
  }

  host.hidden = false;
  host.dataset.archUrl = url;
  host.dataset.archKey = key;
  host.classList.add("architecture-mount");

  const htmlRes = await fetch(`/api/architecture/${key}.html`, {
    cache: "no-store",
  });
  if (!htmlRes.ok) throw new Error(`architecture ${key} not found`);
  const parsed = parseArchifyHtml(await htmlRes.text());

  const styleHtml = [
    ...parsed.styles.map((s) => {
      const idAttr = s.id ? ` id="${s.id}"` : "";
      return `<style${idAttr}>${scopeArchifyCss(s.css)}</style>`;
    }),
    // Host overrides last so they beat Archify 100vh / 100dvh reader layout.
    `<style id="duaer-arch-host-chrome">${hostChromeCss()}</style>`,
  ].join("\n");

  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  host._archify = null;

  shadow.innerHTML = `
    ${styleHtml}
    <div
      class="archify-root"
      data-theme="${parsed.theme}"
      data-preset="${parsed.preset}"
      data-motion-capable="true"
      data-ambient-motion="running"
      lang="${parsed.lang}"
    >${parsed.bodyHtml}</div>
  `;

  const rootEl = shadow.querySelector(".archify-root");
  if (!rootEl) throw new Error("architecture root missing");
  if (!rootEl.querySelector("svg")) throw new Error("architecture svg missing");

  const scopedDocument = createScopedDocument(rootEl, shadow);
  try {
    host._archify = runViewerScript(parsed.main, scopedDocument);
  } catch (err) {
    console.warn("archify viewer init failed", err);
    host._archify = null;
  }

  host.style.removeProperty("height");
  host.style.height = "auto";
  return true;
}

export function clearArchitectureMount(host) {
  if (!host) return;
  host._archify = null;
  if (host.shadowRoot) host.shadowRoot.innerHTML = "";
  host.removeAttribute("data-arch-url");
  host.removeAttribute("data-arch-key");
  host.style.removeProperty("height");
  host.hidden = true;
}

export function architectureKeyFromArchitectureUrl(url) {
  return architectureKeyFromUrl(url);
}

/** Test helpers (Node / unit). */
export const __test = {
  scopeArchifyCss,
  architectureKeyFromUrl,
};
