/**
 * Live desk tooling: ensure git binary; worker CLI version + 10-day upgrades.
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const CLI_UPGRADE_TTL_MS = 10 * 24 * 60 * 60 * 1000;

export const CURSOR_INSTALL_CMD = "curl https://cursor.com/install -fsS | bash";
export const DEEPSEEK_INSTALL_CMD = "npm install -g deepseek-tui@latest";
export const CLAUDE_UPDATE_CMD = "claude update";

function duaerHome() {
  return process.env.DUAER_HOME || join(homedir(), ".duaer");
}

export function cliToolsCachePath() {
  return join(duaerHome(), "cli-tools-check.json");
}

function readCliCache() {
  const p = cliToolsCachePath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeCliCache(data) {
  const p = cliToolsCachePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function isCliCheckDue(cache, now = Date.now(), ttlMs = CLI_UPGRADE_TTL_MS) {
  if (!cache?.checkedAt) return true;
  const t = Date.parse(cache.checkedAt);
  if (!Number.isFinite(t)) return true;
  return now - t >= ttlMs;
}

/**
 * @param {(cmd: string) => string | null} whichCmd
 * @param {(label: string, command: string, args: string[], opts?: object) => { status: number|null, stdout?: string, stderr?: string, error?: Error }} runChild
 */
export function ensureGitInstalled(whichCmd, runChild) {
  if (typeof whichCmd("git") === "string" && whichCmd("git")) {
    return { ok: true, action: "already", path: whichCmd("git") };
  }

  const platform = process.platform;
  const attempts = [];

  if (platform === "darwin" && whichCmd("brew")) {
    attempts.push({
      label: "brew install git",
      command: "brew",
      args: ["install", "git"],
      timeout: 300000,
    });
  }

  if (platform === "linux") {
    if (whichCmd("apt-get")) {
      attempts.push({
        label: "sudo -n apt-get install -y git",
        command: "sudo",
        args: ["-n", "apt-get", "install", "-y", "git"],
        timeout: 300000,
      });
    } else if (whichCmd("dnf")) {
      attempts.push({
        label: "sudo -n dnf install -y git",
        command: "sudo",
        args: ["-n", "dnf", "install", "-y", "git"],
        timeout: 300000,
      });
    } else if (whichCmd("yum")) {
      attempts.push({
        label: "sudo -n yum install -y git",
        command: "sudo",
        args: ["-n", "yum", "install", "-y", "git"],
        timeout: 300000,
      });
    }
  }

  for (const step of attempts) {
    try {
      const r = runChild(step.label, step.command, step.args, {
        encoding: "utf8",
        timeout: step.timeout,
        env: process.env,
      });
      if (r.status === 0 && whichCmd("git")) {
        return { ok: true, action: step.label, path: whichCmd("git") };
      }
    } catch {
      // try next
    }
  }

  const hints = [];
  if (platform === "darwin") {
    hints.push("xcode-select --install");
    hints.push("brew install git");
  } else if (platform === "linux") {
    hints.push("sudo apt-get install -y git");
    hints.push("sudo dnf install -y git");
  } else {
    hints.push("请先安装 Git 并确保 git 在 PATH 中");
  }

  const e = new Error(
    `未检测到 git，自动安装失败。请先安装后再派工：\n${hints.join("\n")}`,
  );
  e.code = "GIT_MISSING";
  throw e;
}

function readVersionLine(runChild, label, command, args) {
  try {
    const r = runChild(label, command, args, {
      encoding: "utf8",
      timeout: 8000,
      env: process.env,
    });
    if (r.status !== 0) return null;
    return String(r.stdout || r.stderr || "")
      .trim()
      .split("\n")[0]
      .slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * Best-effort upgrade for one worker CLI. Never prompts for sudo password.
 */
export function upgradeWorkerCli(id, whichCmd, runChild) {
  if (id === "cursor-agent") {
    const r = runChild("升级 Cursor Agent", "bash", ["-lc", CURSOR_INSTALL_CMD], {
      encoding: "utf8",
      timeout: 180000,
      env: process.env,
    });
    return {
      id,
      ok: r.status === 0,
      detail: String(r.stderr || r.stdout || "").trim().slice(0, 240),
    };
  }
  if (id === "deepseek") {
    const npm = whichCmd("npm") || "npm";
    const r = runChild("升级 DeepSeek CLI", npm, ["install", "-g", "deepseek-tui@latest"], {
      encoding: "utf8",
      timeout: 180000,
      env: process.env,
    });
    return {
      id,
      ok: r.status === 0,
      detail: String(r.stderr || r.stdout || "").trim().slice(0, 240),
    };
  }
  if (id === "claude") {
    const bin = whichCmd("claude");
    if (!bin) {
      return { id, ok: false, detail: "claude not installed" };
    }
    const r = runChild("升级 Claude Code", bin, ["update"], {
      encoding: "utf8",
      timeout: 180000,
      env: process.env,
    });
    return {
      id,
      ok: r.status === 0,
      detail: String(r.stderr || r.stdout || "").trim().slice(0, 240),
    };
  }
  return { id, ok: false, detail: "unknown tool" };
}

/**
 * Every 10 days: upgrade installed worker CLIs, refresh version stamp.
 * @returns {{ skipped: boolean, due: boolean, checkedAt: string, results: object[] }}
 */
export function ensureWorkerClisFresh(whichCmd, runChild, { force = false } = {}) {
  const now = Date.now();
  const checkedAt = new Date(now).toISOString();
  if (process.env.DUAER_NO_CLI_UPGRADE === "1") {
    return {
      skipped: true,
      due: false,
      checkedAt,
      results: [],
      reason: "DUAER_NO_CLI_UPGRADE=1",
    };
  }

  const cache = readCliCache();
  const due = force || isCliCheckDue(cache, now);
  if (!due) {
    return {
      skipped: true,
      due: false,
      checkedAt: cache.checkedAt || checkedAt,
      results: [],
      reason: "within-10d",
    };
  }

  const installed = [];
  if (whichCmd("agent") || whichCmd("cursor")) installed.push("cursor-agent");
  if (whichCmd("claude")) installed.push("claude");
  if (whichCmd("deepseek")) installed.push("deepseek");

  const results = [];
  for (const id of installed) {
    try {
      results.push(upgradeWorkerCli(id, whichCmd, runChild));
    } catch (err) {
      results.push({
        id,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const tools = { ...(cache?.tools || {}) };
  for (const id of installed) {
    let version = null;
    if (id === "cursor-agent") {
      const bin = whichCmd("agent") || whichCmd("cursor");
      version = bin
        ? readVersionLine(
            runChild,
            "version",
            bin,
            whichCmd("agent") ? ["--version"] : ["agent", "--version"],
          )
        : null;
    } else if (id === "deepseek") {
      const bin = whichCmd("deepseek");
      version = bin
        ? readVersionLine(runChild, "version", bin, ["--version"])
        : null;
    } else if (id === "claude") {
      const bin = whichCmd("claude");
      version = bin
        ? readVersionLine(runChild, "version", bin, ["--version"])
        : null;
    }
    tools[id] = {
      version,
      upgradedAt: checkedAt,
      ok: results.find((r) => r.id === id)?.ok ?? false,
    };
  }

  writeCliCache({ checkedAt, tools, results });
  return { skipped: false, due: true, checkedAt, results, tools };
}

/** Test helper: pure spawn wrapper shape matching live's runChildSync. */
export function defaultRunChild(label, command, args, options = {}) {
  const { timeout, ...rest } = options;
  const r = spawnSync(command, args, {
    ...rest,
    timeout,
    killSignal: "SIGKILL",
  });
  if (r.error) throw r.error;
  return r;
}
