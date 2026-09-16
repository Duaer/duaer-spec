/**
 * npm latest check + self-update helpers for duaer-spec CLI / live desk.
 * Default: notify only. Never auto-install without `duaer self-update`.
 */

import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, "..");
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REGISTRY_URL = "https://registry.npmjs.org/duaer-spec/latest";

function duaerHome() {
  return process.env.DUAER_HOME || join(homedir(), ".duaer");
}

function cachePath() {
  return join(duaerHome(), "update-check.json");
}

export function localPackageVersion() {
  return String(PKG.version || "0.0.0");
}

function readCache() {
  const p = cachePath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeCache(data) {
  const p = cachePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Semver-ish compare: returns 1 if a>b, -1 if a<b, 0 if equal/unknown. */
export function cmpSemver(a, b) {
  const pa = String(a || "0")
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((x) => parseInt(x, 10) || 0);
  const pb = String(b || "0")
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

async function fetchLatestFromNpm(timeoutMs = 4000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(REGISTRY_URL, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`npm HTTP ${res.status}`);
    const json = await res.json();
    const latest = String(json?.version || "").trim();
    if (!latest) throw new Error("no version in npm packument");
    return latest;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @returns {Promise<{
 *   current: string,
 *   latest: string | null,
 *   outdated: boolean,
 *   skipped: boolean,
 *   reason?: string,
 *   checkedAt: string
 * }>}
 */
export async function checkForUpdate({ force = false } = {}) {
  const current = localPackageVersion();
  const now = Date.now();
  if (process.env.DUAER_NO_UPDATE_CHECK === "1") {
    return {
      current,
      latest: null,
      outdated: false,
      skipped: true,
      reason: "DUAER_NO_UPDATE_CHECK=1",
      checkedAt: new Date().toISOString(),
    };
  }

  const cache = readCache();
  if (
    !force &&
    cache?.latest &&
    cache?.checkedAt &&
    now - Date.parse(cache.checkedAt) < CACHE_TTL_MS
  ) {
    const latest = String(cache.latest);
    return {
      current,
      latest,
      outdated: cmpSemver(latest, current) > 0,
      skipped: false,
      cached: true,
      checkedAt: cache.checkedAt,
    };
  }

  try {
    const latest = await fetchLatestFromNpm();
    const checkedAt = new Date().toISOString();
    writeCache({ current, latest, checkedAt });
    return {
      current,
      latest,
      outdated: cmpSemver(latest, current) > 0,
      skipped: false,
      cached: false,
      checkedAt,
    };
  } catch (err) {
    return {
      current,
      latest: cache?.latest || null,
      outdated:
        cache?.latest != null ? cmpSemver(cache.latest, current) > 0 : false,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
      checkedAt: new Date().toISOString(),
    };
  }
}

export function formatUpdateHint(info) {
  if (!info?.outdated || !info.latest) return null;
  return `duaer-spec ${info.current} → ${info.latest} available. Upgrade CLI: duaer self-update   ·  refresh a product repo: npx duaer-spec@latest update`;
}

/** Fire-and-forget console hint (non-blocking for callers that await briefly). */
export async function maybePrintUpdateHint({ force = false } = {}) {
  try {
    const info = await checkForUpdate({ force });
    const line = formatUpdateHint(info);
    if (line) console.log(`\n[duaer] ${line}\n`);
    return info;
  } catch {
    return null;
  }
}

export function runSelfUpdate() {
  console.log(`Current: duaer-spec ${localPackageVersion()}`);
  console.log("Installing: npm i -g duaer-spec@latest …\n");
  const r = spawnSync(
    "npm",
    ["install", "-g", "duaer-spec@latest"],
    { stdio: "inherit", env: process.env, shell: process.platform === "win32" },
  );
  if (r.error) {
    throw new Error(`npm failed to start: ${r.error.message}`);
  }
  if (r.status !== 0) {
    process.exitCode = r.status || 1;
    console.error("\nself-update failed. Try: npm i -g duaer-spec@latest");
    return;
  }
  console.log("\nCLI upgraded. In each product repo that used init, also run:");
  console.log("  npx duaer-spec@latest update");
  // Refresh cache
  checkForUpdate({ force: true }).catch(() => {});
}

/** Background check that never blocks the event loop long for live server. */
export function scheduleUpdateHint() {
  if (process.env.DUAER_NO_UPDATE_CHECK === "1") return;
  setTimeout(() => {
    void maybePrintUpdateHint({ force: false });
  }, 50);
}
