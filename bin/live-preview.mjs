/**
 * Resolve openable preview URLs for live desk results.
 * Pages (relative paths) or local HTTP services (localhost).
 */

import fs from "node:fs";
import path from "node:path";

const PREVIEW_CANDIDATES = [
  "index.html",
  "public/index.html",
  "dist/index.html",
  "build/index.html",
  "docs/index.html",
  "preview.html",
  "demo.html",
];

const README_NAMES = ["README.md", "README.zh-CN.md", "readme.md", "Readme.md"];
const SERVER_ENTRY_CANDIDATES = [
  "server.mjs",
  "server.js",
  "index.mjs",
  "index.js",
  "app.mjs",
  "app.js",
  "src/server.mjs",
  "src/server.js",
  "src/index.mjs",
  "src/index.js",
];

/**
 * Find a local service URL from README / package.json / server entry.
 * @param {string} worktreePath
 * @returns {string|null}
 */
export function inferLocalServiceUrl(worktreePath) {
  const root = String(worktreePath || "").trim();
  if (!root || !fs.existsSync(root)) return null;

  for (const name of README_NAMES) {
    const file = path.join(root, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8").slice(0, 40_000);
    } catch {
      continue;
    }
    const m = text.match(
      /https?:\/\/(?:127\.0\.0\.1|localhost):\d{2,5}(?:\/[^\s)\]"'`<>]*)?/i,
    );
    if (m) return String(m[0]).replace(/[.,;:]+$/g, "");
  }

  let port = null;
  const pkgPath = path.join(root, "package.json");
  let hasStartScript = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
      const blob = [scripts.start, scripts.dev, scripts.serve, scripts.preview]
        .filter(Boolean)
        .join("\n");
      hasStartScript = Boolean(scripts.start || scripts.dev || scripts.serve);
      const pm =
        blob.match(/PORT[=:\s]+(\d{2,5})/i) ||
        blob.match(/--port[=:\s]+(\d{2,5})/i) ||
        blob.match(/-p\s+(\d{2,5})\b/) ||
        blob.match(/localhost:(\d{2,5})/i) ||
        blob.match(/127\.0\.0\.1:(\d{2,5})/);
      if (pm) port = pm[1];
    } catch {
      /* ignore */
    }
  }

  if (!port) {
    const envPath = path.join(root, ".env");
    if (fs.existsSync(envPath)) {
      try {
        const em = fs
          .readFileSync(envPath, "utf8")
          .match(/^\s*PORT\s*=\s*(\d{2,5})\s*$/m);
        if (em) port = em[1];
      } catch {
        /* ignore */
      }
    }
  }

  if (!port) {
    for (const rel of SERVER_ENTRY_CANDIDATES) {
      const file = path.join(root, rel);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      let src = "";
      try {
        src = fs.readFileSync(file, "utf8").slice(0, 12_000);
      } catch {
        continue;
      }
      const sm =
        src.match(/\blisten\(\s*(\d{2,5})\b/) ||
        src.match(/PORT[^\n]{0,60}?(\d{4,5})/) ||
        src.match(/localhost:(\d{2,5})/i);
      if (sm) {
        port = sm[1];
        hasStartScript = true;
        break;
      }
    }
  }

  if (!port && hasStartScript) port = "3000";
  if (!port) return null;
  return `http://localhost:${port}`;
}

/**
 * @param {{ delivery?: object, worktreePath?: string, jobId?: string }} opts
 * @returns {{ url: string, label: string, source: string, kind: string, path?: string } | null}
 */
export function resolvePreviewPayload({ delivery, worktreePath, jobId }) {
  const d = delivery && typeof delivery === "object" ? delivery : {};
  const raw =
    d.preview?.url ||
    d.previewUrl ||
    d.demoUrl ||
    d.artifact?.url ||
    null;
  const label =
    d.preview?.label ||
    d.previewLabel ||
    d.artifact?.label ||
    "查看结果";

  if (raw && /^https?:\/\//i.test(String(raw).trim())) {
    return {
      url: String(raw).trim(),
      label,
      source: "delivery",
      kind: "external",
    };
  }

  let rel = null;
  if (raw) {
    const s = String(raw).trim().replace(/^\.\//, "");
    if (path.isAbsolute(s) && worktreePath) {
      const abs = path.resolve(s);
      const root = path.resolve(worktreePath);
      if (abs.startsWith(root + path.sep) || abs === root) {
        rel = path.relative(root, abs).split(path.sep).join("/");
      }
    } else if (!s.includes("..")) {
      rel = s.replace(/^\/+/, "");
    }
  }

  if (!rel && worktreePath && fs.existsSync(worktreePath)) {
    for (const cand of PREVIEW_CANDIDATES) {
      const full = path.join(worktreePath, cand);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        rel = cand;
        break;
      }
    }
  }

  if (rel && jobId) {
    const safeJob = encodeURIComponent(jobId);
    const safeRel = rel
      .split("/")
      .map((p) => encodeURIComponent(p))
      .join("/");
    return {
      url: `/api/artifact/${safeJob}/${safeRel}`,
      label,
      source: raw ? "delivery" : "auto",
      kind: "artifact",
      path: rel,
    };
  }

  const serviceUrl = inferLocalServiceUrl(worktreePath);
  if (serviceUrl) {
    return {
      url: serviceUrl,
      label,
      source: raw ? "delivery" : "auto-service",
      kind: "external",
    };
  }

  return null;
}

export { PREVIEW_CANDIDATES };
