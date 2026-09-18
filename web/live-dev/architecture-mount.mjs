/**
 * Mount Archify architecture HTML into a page host (no iframe).
 * Shadow DOM keeps Archify CSS isolated; SVG height flows with the canvas.
 */

const STYLE_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SVG_RE = /<svg\b[\s\S]*?<\/svg>/i;

function architectureKeyFromUrl(url) {
  const raw = String(url || "");
  const m = raw.match(/\/api\/architecture\/([a-f0-9]+)\.html/i);
  return m ? m[1].toLowerCase() : "";
}

function extractSvg(html) {
  // Prefer the main diagram SVG; wrap it so Archify container CSS applies.
  const svg = String(html || "").match(SVG_RE);
  if (!svg) return null;
  return {
    wrapHtml: `<div class="diagram-container" data-detail-level="read">${svg[0]}</div>`,
    svgHtml: svg[0],
  };
}

function extractStyles(html) {
  const chunks = [];
  for (const m of String(html || "").matchAll(STYLE_RE)) {
    const css = String(m[1] || "").trim();
    if (css) chunks.push(css);
  }
  return chunks.join("\n\n");
}

/** Rewrite document-level Archify selectors for Shadow :host. */
function scopeArchifyCss(css) {
  return String(css || "")
    .replace(/html\[data-embed="true"\]/g, ":host")
    .replace(/html\[data-present="true"\]/g, ":host")
    .replace(/html\[([^\]]+)\]/g, ":host[$1]")
    .replace(/\bhtml\b/g, ":host")
    .replace(/\bbody\b/g, ":host");
}

function hostChromeCss() {
  return `
:host {
  display: block;
  position: relative;
  width: 100%;
  background: #0b1118;
  color: #e8eef7;
  overflow: visible;
}
:host([hidden]) { display: none !important; }
.architecture-canvas {
  position: relative;
  width: 100%;
  padding: 100px 0 28px 100px;
  box-sizing: border-box;
  overflow: visible;
}
.architecture-canvas .diagram-container {
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  position: relative !important;
}
.architecture-canvas svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: none;
}
.architecture-canvas svg [data-node-id] {
  cursor: pointer;
}
.architecture-canvas svg [data-node-id].is-arch-focus {
  filter: drop-shadow(0 0 10px rgba(96, 165, 250, 0.55));
}
.arch-passport {
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  z-index: 5;
  width: min(22rem, calc(100% - 1.5rem - 100px));
  max-width: calc(100% - 1.5rem - 100px);
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: visible;
}
.arch-passport[hidden] { display: none !important; }
.arch-passport-title {
  margin: 0 0 0.2rem;
  font-size: 0.92rem;
  font-weight: 700;
}
.arch-passport-sub {
  margin: 0 0 0.55rem;
  font-size: 0.78rem;
  color: #94a3b8;
}
.arch-passport-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
}
.arch-passport-list li {
  font-size: 0.8rem;
  line-height: 1.35;
  color: #cbd5e1;
}
.arch-passport-close {
  position: absolute;
  top: 0.4rem;
  right: 0.45rem;
  border: 0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
`;
}

function buildPassportModel(ir, nodeId) {
  const id = String(nodeId || "");
  const comps = Array.isArray(ir?.components) ? ir.components : [];
  const links = Array.isArray(ir?.connections)
    ? ir.connections
    : Array.isArray(ir?.links)
      ? ir.links
      : [];
  const comp = comps.find((c) => String(c?.id || "") === id) || null;
  const label =
    String(comp?.label || comp?.name || id || "Node").trim() || id;
  const sub = [comp?.type, comp?.sublabel || comp?.tag]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(" · ");
  const rel = [];
  for (const l of links) {
    const from = String(l?.from || l?.source || "");
    const to = String(l?.to || l?.target || "");
    const edge = String(l?.label || "").trim();
    if (from === id && to) {
      const other =
        comps.find((c) => String(c?.id || "") === to)?.label || to;
      rel.push(edge ? `→ ${other}（${edge}）` : `→ ${other}`);
    } else if (to === id && from) {
      const other =
        comps.find((c) => String(c?.id || "") === from)?.label || from;
      rel.push(edge ? `← ${other}（${edge}）` : `← ${other}`);
    }
  }
  return { id, label, sub, rel: rel.slice(0, 12) };
}

function renderPassport(shadow, model) {
  let box = shadow.querySelector(".arch-passport");
  if (!box) {
    box = document.createElement("div");
    box.className = "arch-passport";
    box.innerHTML = `
      <button type="button" class="arch-passport-close" aria-label="close">×</button>
      <p class="arch-passport-title"></p>
      <p class="arch-passport-sub"></p>
      <ul class="arch-passport-list"></ul>
    `;
    shadow.appendChild(box);
    box.querySelector(".arch-passport-close")?.addEventListener("click", () => {
      box.hidden = true;
      shadow
        .querySelectorAll("[data-node-id].is-arch-focus")
        .forEach((n) => n.classList.remove("is-arch-focus"));
    });
  }
  box.querySelector(".arch-passport-title").textContent = model.label;
  const sub = box.querySelector(".arch-passport-sub");
  sub.textContent = model.sub || "";
  sub.hidden = !model.sub;
  const list = box.querySelector(".arch-passport-list");
  list.replaceChildren();
  if (!model.rel.length) {
    const li = document.createElement("li");
    li.textContent = "暂无连接说明";
    list.appendChild(li);
  } else {
    for (const line of model.rel) {
      const li = document.createElement("li");
      li.textContent = line;
      list.appendChild(li);
    }
  }
  box.hidden = false;
}

/**
 * @param {HTMLElement} host
 * @param {{ url: string, ir?: object|null }} opts
 */
export async function mountArchitectureDiagram(host, opts = {}) {
  if (!host) return false;
  const url = String(opts.url || host.dataset.archUrl || "").trim();
  if (!url) {
    host.replaceChildren();
    host.hidden = true;
    return false;
  }
  const key = architectureKeyFromUrl(url);
  if (!key) {
    host.hidden = true;
    return false;
  }

  host.hidden = false;
  host.dataset.archUrl = url;
  host.dataset.archKey = key;
  host.classList.add("architecture-mount");

  const htmlRes = await fetch(`/api/architecture/${key}.html?embed=1`, {
    cache: "no-store",
  });
  if (!htmlRes.ok) throw new Error(`architecture ${key} not found`);
  const html = await htmlRes.text();
  const extracted = extractSvg(html);
  if (!extracted?.svgHtml) throw new Error("architecture svg missing");

  let ir = opts.ir && typeof opts.ir === "object" ? opts.ir : null;
  if (!ir) {
    try {
      const jr = await fetch(`/api/architecture/${key}.json`, {
        cache: "no-store",
      });
      if (jr.ok) ir = await jr.json();
    } catch {
      ir = null;
    }
  }

  const shadow =
    host.shadowRoot || host.attachShadow({ mode: "open" });
  const scoped = scopeArchifyCss(extractStyles(html));
  const canvasInner = extracted.wrapHtml
    ? extracted.wrapHtml
    : `<div class="diagram-container">${extracted.svgHtml}</div>`;

  shadow.innerHTML = `
    <style>${hostChromeCss()}\n${scoped}</style>
    <div class="architecture-canvas" data-embed="true">${canvasInner}</div>
  `;

  const canvas = shadow.querySelector(".architecture-canvas");
  canvas?.querySelectorAll("[data-node-id]").forEach((node) => {
    node.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const id = node.getAttribute("data-node-id");
      shadow
        .querySelectorAll("[data-node-id].is-arch-focus")
        .forEach((n) => n.classList.remove("is-arch-focus"));
      node.classList.add("is-arch-focus");
      renderPassport(shadow, buildPassportModel(ir, id));
    });
  });

  // Content-driven height: clear any leftover iframe pixel height.
  host.style.removeProperty("height");
  host.style.height = "auto";
  return true;
}

export function clearArchitectureMount(host) {
  if (!host) return;
  if (host.shadowRoot) host.shadowRoot.innerHTML = "";
  host.removeAttribute("data-arch-url");
  host.removeAttribute("data-arch-key");
  host.style.removeProperty("height");
  host.hidden = true;
}

export function architectureKeyFromArchitectureUrl(url) {
  return architectureKeyFromUrl(url);
}
