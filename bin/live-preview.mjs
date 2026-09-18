/**
 * Resolve openable preview URLs for live desk results.
 * Pages (relative paths) or local HTTP services (localhost).
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

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
    "打开看看";

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

export function parseLocalPreviewPort(url) {
  try {
    const u = new URL(String(url || "").trim());
    if (!/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) return null;
    const port = Number(u.port || (u.protocol === "https:" ? 443 : 80));
    return Number.isFinite(port) && port > 0 ? port : null;
  } catch {
    return null;
  }
}

export function isLocalPreviewUrl(url) {
  return parseLocalPreviewPort(url) != null;
}

export function probePortOpen(port, host = "127.0.0.1", timeoutMs = 500) {
  const p = Number(port);
  if (!Number.isFinite(p) || p <= 0) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = net.connect({ port: p, host }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function waitForPort(
  port,
  { timeoutMs = 25000, intervalMs = 350 } = {},
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await probePortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export function pickStartCommand(worktreePath) {
  const root = String(worktreePath || "").trim();
  if (!root) return null;
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const s = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    if (s.start) return { cmd: "npm", args: ["start"], script: "start" };
    if (s.dev) return { cmd: "npm", args: ["run", "dev"], script: "dev" };
    if (s.serve) return { cmd: "npm", args: ["run", "serve"], script: "serve" };
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Start local preview service if the URL is localhost and the port is closed.
 * @returns {Promise<{ ok: boolean, started: boolean, alreadyRunning: boolean, url: string, port?: number, pid?: number }>}
 */
export async function ensureLocalPreviewService({
  worktreePath,
  previewUrl,
  logPath = null,
}) {
  const url = String(previewUrl || "").trim();
  const port = parseLocalPreviewPort(url);
  if (!port) {
    return { ok: true, started: false, alreadyRunning: false, url };
  }
  if (await probePortOpen(port)) {
    return {
      ok: true,
      started: false,
      alreadyRunning: true,
      url,
      port,
    };
  }
  const root = String(worktreePath || "").trim();
  if (!root || !fs.existsSync(root)) {
    const e = new Error("project folder not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  const start = pickStartCommand(root);
  if (!start) {
    const e = new Error("package.json has no start/dev/serve script");
    e.code = "NO_START";
    throw e;
  }
  let stdio = "ignore";
  if (logPath) {
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      const fd = fs.openSync(logPath, "a");
      stdio = ["ignore", fd, fd];
    } catch {
      stdio = "ignore";
    }
  }
  const child = spawn(start.cmd, start.args, {
    cwd: root,
    detached: true,
    stdio,
    env: { ...process.env, PORT: String(port) },
  });
  child.unref();
  const up = await waitForPort(port, { timeoutMs: 25000 });
  if (!up) {
    const e = new Error("service did not become ready in time");
    e.code = "START_TIMEOUT";
    throw e;
  }
  return {
    ok: true,
    started: true,
    alreadyRunning: false,
    url,
    port,
    pid: child.pid || undefined,
    script: start.script,
  };
}

/**
 * Probe whether a localhost preview URL is currently listening.
 * @returns {Promise<{ url: string, local: boolean, listening: boolean|null, port: number|null, canStart: boolean }>}
 */
export async function probeLocalPreviewStatus({
  previewUrl,
  worktreePath = "",
} = {}) {
  const url = String(previewUrl || "").trim();
  const port = parseLocalPreviewPort(url);
  if (!port) {
    return {
      url,
      local: false,
      listening: null,
      port: null,
      canStart: false,
    };
  }
  const listening = await probePortOpen(port);
  const canStart =
    !listening && Boolean(pickStartCommand(String(worktreePath || "").trim()));
  return {
    url,
    local: true,
    listening,
    port,
    canStart,
  };
}

export { PREVIEW_CANDIDATES };
