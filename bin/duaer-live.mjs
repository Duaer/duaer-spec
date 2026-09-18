/**
 * Duaer-spec FED (现场开发) — isolated desk (not the user's product repo).
 *
 * Workspace: ~/.duaer/live/  (override with DUAER_HOME)
 *   config.json   model settings
 *   jobs/<nnn-*>  confirmed Briefs
 *
 * Usage:
 *   duaer live [--port 8787]
 *   duaer live config --base-url URL --api-key KEY --model NAME
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import {
  checkForUpdate,
  formatUpdateHint,
  scheduleUpdateHint,
} from "./update-check.mjs";
import {
  buildDetailedProductTasksMd,
  buildDetailedRevisionTasksMd,
  parseWorktreeActivityFromGit,
} from "./live-progress.mjs";
import {
  deployPromptForTarget,
  isDeployPlanned,
  normalizeDeployTarget,
} from "./deploy-targets.mjs";
import { enrichChatOptions } from "../web/live-dev/choice-options.mjs";
import { allocateUniqueFeatBranch } from "./live-worktree-name.mjs";
import {
  ensureGitInstalled,
  CURSOR_INSTALL_CMD as TOOLING_CURSOR_INSTALL,
} from "./live-tooling.mjs";
import {
  ensureProductDir,
  resolveProductRepoPath,
} from "./live-repo-path.mjs";
import {
  buildProjectList,
  normalizeProjectKey,
} from "./live-projects.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(PACKAGE_ROOT, "web", "live-dev");

/** Extra dirs for CLI discovery (launchd PATH is often /usr/bin:/bin only). */
const CLI_PATH_DIRS = [
  path.join(os.homedir(), ".local", "bin"),
  path.join(os.homedir(), ".cargo", "bin"),
  "/usr/local/bin",
  "/opt/homebrew/bin",
];

function npmGlobalBinDir() {
  try {
    const r = spawnSync("npm", ["prefix", "-g"], {
      encoding: "utf8",
      timeout: 4000,
      env: process.env,
    });
    if (r.status === 0) {
      const prefix = String(r.stdout || "").trim();
      if (prefix) return path.join(prefix, "bin");
    }
  } catch {
    // ignore
  }
  return null;
}

function nvmBinDirs() {
  const root = path.join(os.homedir(), ".nvm", "versions", "node");
  const dirs = [];
  const preferred = nvmNodeBinDirFor(process.version);
  if (preferred) dirs.push(preferred);
  if (!fs.existsSync(root)) return dirs;
  try {
    for (const name of fs.readdirSync(root)) {
      const d = path.join(root, name, "bin");
      if (fs.existsSync(d) && !dirs.includes(d)) dirs.push(d);
    }
  } catch {
    // ignore
  }
  return dirs;
}

function nvmNodeBinDirFor(version) {
  const ver = String(version || "").trim();
  if (!ver) return null;
  const dir = path.join(os.homedir(), ".nvm", "versions", "node", ver, "bin");
  return fs.existsSync(dir) ? dir : null;
}

function cliSearchDirs() {
  const dirs = [...CLI_PATH_DIRS];
  for (const d of [npmGlobalBinDir(), ...nvmBinDirs()]) {
    if (d && !dirs.includes(d)) dirs.push(d);
  }
  return dirs;
}

function ensureCliSearchPath() {
  const cur = String(process.env.PATH || "");
  const parts = cur.split(path.delimiter).filter(Boolean);
  const extras = cliSearchDirs().filter(
    (d) => d && fs.existsSync(d) && !parts.includes(d),
  );
  if (extras.length) {
    process.env.PATH = [...extras, ...parts].join(path.delimiter);
  }
}

ensureCliSearchPath();

/** Last npm update check result for /api/health (refreshed in background). */
let updateInfoCache = null;

/** Built-in OpenAI-compatible provider presets (UI + CLI). */
const PROVIDERS = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  custom: {
    id: "custom",
    label: "自定义",
    baseUrl: "",
    model: "",
  },
};

function listProviders() {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    baseUrl: p.baseUrl,
    model: p.model,
  }));
}

function resolveProvider(id) {
  const key = String(id || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return PROVIDERS[key] || null;
}

function inferProviderId(cfg) {
  const base = String(cfg?.baseUrl || "")
    .trim()
    .replace(/\/$/, "")
    .toLowerCase();
  if (!base) return "deepseek";
  if (base.includes("deepseek.com")) return "deepseek";
  if (base.includes("api.openai.com")) return "openai";
  return "custom";
}

function duaerHome() {
  const fromEnv = String(process.env.DUAER_HOME || "").trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), ".duaer");
}

function liveRoot() {
  return path.join(duaerHome(), "live");
}

function configPath() {
  return path.join(liveRoot(), "config.json");
}

function jobsRoot() {
  return path.join(liveRoot(), "jobs");
}

function ensureLiveDirs() {
  fs.mkdirSync(liveRoot(), { recursive: true });
  fs.mkdirSync(jobsRoot(), { recursive: true });
}

function readConfig() {
  ensureLiveDirs();
  const p = configPath();
  if (!fs.existsSync(p)) {
    return {
      baseUrl: String(process.env.DUAER_LIVE_BASE_URL || "").trim(),
      apiKey: String(process.env.DUAER_LIVE_API_KEY || "").trim(),
      model: String(process.env.DUAER_LIVE_MODEL || "").trim(),
      preferredAgentId: "",
      projectsRoot: "",
      activeProjectPath: "",
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      baseUrl: String(raw.baseUrl || process.env.DUAER_LIVE_BASE_URL || "").trim(),
      apiKey: String(raw.apiKey || process.env.DUAER_LIVE_API_KEY || "").trim(),
      model: String(raw.model || process.env.DUAER_LIVE_MODEL || "").trim(),
      preferredAgentId: String(raw.preferredAgentId || "").trim(),
      projectsRoot: String(raw.projectsRoot || "").trim(),
      activeProjectPath: String(raw.activeProjectPath || "").trim(),
    };
  } catch {
    return {
      baseUrl: "",
      apiKey: "",
      model: "",
      preferredAgentId: "",
      projectsRoot: "",
      activeProjectPath: "",
    };
  }
}

function writeConfig(partial) {
  ensureLiveDirs();
  const cur = readConfig();
  const next = {
    baseUrl: partial.baseUrl !== undefined ? String(partial.baseUrl).trim() : cur.baseUrl,
    apiKey: partial.apiKey !== undefined ? String(partial.apiKey).trim() : cur.apiKey,
    model: partial.model !== undefined ? String(partial.model).trim() : cur.model,
    preferredAgentId:
      partial.preferredAgentId !== undefined
        ? String(partial.preferredAgentId).trim()
        : cur.preferredAgentId,
    projectsRoot:
      partial.projectsRoot !== undefined
        ? String(partial.projectsRoot).trim().replace(/[\\/]+$/, "")
        : cur.projectsRoot,
    activeProjectPath:
      partial.activeProjectPath !== undefined
        ? String(partial.activeProjectPath).trim().replace(/[\\/]+$/, "")
        : cur.activeProjectPath,
  };
  fs.writeFileSync(configPath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function configReady(cfg = readConfig()) {
  return Boolean(cfg.baseUrl && cfg.apiKey && cfg.model);
}

function publicUpdate() {
  const info = updateInfoCache;
  if (!info) {
    return {
      current: null,
      latest: null,
      outdated: false,
      hint: null,
    };
  }
  return {
    current: info.current,
    latest: info.latest,
    outdated: Boolean(info.outdated),
    hint: formatUpdateHint(info),
    skipped: Boolean(info.skipped),
    checkedAt: info.checkedAt || null,
  };
}

function publicConfig(cfg = readConfig()) {
  return {
    ready: configReady(cfg),
    baseUrl: cfg.baseUrl || "",
    model: cfg.model || "",
    hasApiKey: Boolean(cfg.apiKey),
    provider: inferProviderId(cfg),
    preferredAgentId: cfg.preferredAgentId || "",
    projectsRoot: cfg.projectsRoot || "",
    activeProjectPath: cfg.activeProjectPath || "",
    liveRoot: liveRoot(),
    jobsRoot: jobsRoot(),
    providers: listProviders(),
    update: publicUpdate(),
  };
}

async function refreshUpdateInfo({ force = false } = {}) {
  try {
    updateInfoCache = await checkForUpdate({ force });
  } catch {
    // keep prior cache
  }
  return updateInfoCache;
}

function parseArgs(argv) {
  const out = {
    cmd: "serve",
    port: 8787,
    provider: null,
    baseUrl: null,
    apiKey: null,
    model: null,
    repoPath: null,
  };
  const args = argv.slice(2);
  if (args[0] === "config") {
    out.cmd = "config";
    args.shift();
  } else if (args[0] === "repo" && args[1] === "add") {
    out.cmd = "repo-add";
    args.shift();
    args.shift();
    if (args[0] && !args[0].startsWith("-")) {
      out.repoPath = args.shift();
    }
  }
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--port" && args[i + 1]) out.port = Number(args[++i]) || 8787;
    else if (a === "--provider" && args[i + 1]) out.provider = args[++i];
    else if (a === "--base-url" && args[i + 1]) out.baseUrl = args[++i];
    else if (a === "--api-key" && args[i + 1]) out.apiKey = args[++i];
    else if (a === "--model" && args[i + 1]) out.model = args[++i];
    else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
    else if (out.cmd === "repo-add" && out.repoPath == null) out.repoPath = a;
  }
  return out;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(data);
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  return "application/octet-stream";
}

function serveStatic(req, res) {
  let urlPath = new URL(req.url || "/", "http://local").pathname;
  if (urlPath === "/") urlPath = "/index.html";
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(WEB_ROOT, safe);
  if (!filePath.startsWith(WEB_ROOT)) {
    send(res, 403, { error: "forbidden" });
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, { error: "not found" });
    return;
  }
  send(res, 200, fs.readFileSync(filePath, "utf8"), contentType(filePath));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function slugify(text) {
  const ascii = String(text || "job")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (ascii) return ascii;
  return `job-${Date.now().toString(36).slice(-6)}`;
}

function nextJobDir() {
  ensureLiveDirs();
  const root = jobsRoot();
  const existing = fs.readdirSync(root).filter((n) => /^\d{3}-/.test(n));
  let max = 0;
  for (const name of existing) {
    const n = Number(name.slice(0, 3));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return { root, nextNum: max + 1 };
}

const SYSTEM_PROMPT = `你是「Duaer-spec FED」需求助手。通过多轮对话把用户随口说的话整理成精确需求，使数字员工能直接交付让人满意的成品。

规则：
1. 缺关键可执行信息时，每次只问 1 个卡点问题；信息够时不要用「请从多种风格/方向里选一个」代替可执行的验收标准。
2. 维护四块：goal（要做什么）、outOfScope（不做什么）、acceptance（验收标准）、assumptions（假设）。
3. acceptance 必须可客观检查（打开何处、看到什么、哪条命令通过）；禁止只写「更好用/更好看」。
4. 四块够清楚、验收可检查时，直接填卡并 ready=true，让用户去点确认（确认前系统会自动校验）。
5. 不要写代码。不要假设用户仓库路径。
6. 只要问题是让用户做选择（A/B、平台、是否、静态/带后端等），必须在 JSON 的 options 填 2～5 个短选项（每个≤20字）。用户界面会显示可点击按钮，一点即发。禁止只在正文用「1. 2. 3.」或「请回复数字/请输入」却把 options 留空。
7. 输出格式（严格）：
   - 先写对用户说的纯文本（可多行，不要 JSON；正文里不要再列一遍选项清单）
   - 然后单独一行：<<<JSON>>>
   - 再输出一个 JSON 对象（不要 markdown 围栏）：
{"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"...","ready":false,"options":["可选A","可选B"]}`;

const CHAT_JSON_MARKER = "<<<JSON>>>";

const REVISE_CHAT_PROMPT = `你是「Duaer-spec FED」改进对话助手。用户已看过成品但不满意。通过多轮对话弄清：为什么不满意、要改成什么样、什么不要动。目标是改完后用户能满意。

规则：
1. 缺关键信息时每次只问 1 个问题；信息够时直接填可执行的四块并 ready=true，不要用「请从 A/B/C/D 风格里选」代替验收标准。
2. 维护四块（仍用确认卡字段名，便于前端复用）：
   - goal = 本轮要改什么（具体可执行）
   - outOfScope = 本轮不要动什么
   - acceptance = 怎么算改好了（可检查：打开/看到/命令通过）
   - assumptions = 用户不满意的原因 / 背景摘要
3. 四块够清楚且可执行时 ready=true（确认前系统会自动校验）。
4. 不要写代码。不要立刻派工。不要假设仓库路径。
5. 只要问题是让用户做选择，必须在 options 填 2～5 个短选项（≤20字）；界面可点选发送。禁止只让用户手打或「请回复数字」。
6. 输出格式（严格）：
   - 先写对用户说的纯文本（正文不要再列选项清单）
   - 然后单独一行：<<<JSON>>>
   - 再输出 JSON（不要 markdown 围栏）：
{"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"...","ready":false,"options":["可选A","可选B"]}`;

const ACCEPT_PROMPT = `你是「Duaer-spec FED」需求验收官。用户即将锁定确认卡并开工。目标是：规范需求，使数字员工能直接交付让人满意的成品。

检查：
1. goal 是否单一、可执行（一件事，不要堆多个无关功能）
2. acceptance 是否可客观检查：必须写清「打开/看到/点击/返回/命令通过/接口返回」等可核对结果；禁止仅「更好用 / 更好看 / nicer / looks better」这类空话
3. outOfScope 是否划清边界（可简短）
4. assumptions 是否合理、不偷换目标
5. 按该验收标准做完后，用户是否有理由满意（成品可核对，而非过程叙事）

规则：
- 若小改即可通过：修订四块（尤其把 acceptance 改成可检查句子），passed=true
- 若缺关键信息：passed=false，issues 列出缺什么（中文，短句）
- 不要写代码。不要假设仓库路径。
- 只输出一个 JSON，不要 markdown 围栏：
{"passed":false,"summary":"一句话结论","issues":["问题1"],"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"..."}`;

const FIX_ACCEPT_PROMPT = `你是「Duaer-spec FED」需求修正助手。自动验收未通过，请根据 issues 修订确认卡四块。优先把 acceptance 改成可客观检查的句子（打开何处、看到什么、哪条命令通过），不要编造用户没提过的大功能。

规则：
1. 针对每条 issue 修改 goal / outOfScope / acceptance / assumptions
2. 保持用户原意；缺信息时写合理、可检查的默认假设，并写进 assumptions
3. 不要写代码。不要假设仓库路径。
4. 只输出一个 JSON，不要 markdown 围栏：
{"summary":"一句话说明改了什么","goal":"...","outOfScope":"...","acceptance":"...","assumptions":"..."}`;

/** Bare fetch has no default deadline; a stalled provider would never settle. */
const LLM_TIMEOUT_MS = 60000;
const LLM_STREAM_TIMEOUT_MS = 180000;

function llmTimeoutError(ms) {
  return new Error(
    `模型调用超过 ${Math.round(ms / 1000)} 秒未返回，已中止。请检查模型服务是否可用。`,
  );
}

async function callChatModel(cfg, messages, systemPrompt = SYSTEM_PROMPT) {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const body = {
    model: cfg.model,
    temperature:
      systemPrompt === ACCEPT_PROMPT || systemPrompt === FIX_ACCEPT_PROMPT
        ? 0.15
        : 0.3,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };
  // DeepSeek Flash defaults to thinking; disable for reliable JSON replies.
  if (inferProviderId(cfg) === "deepseek") {
    body.thinking = { type: "disabled" };
  }
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw llmTimeoutError(LLM_TIMEOUT_MS);
    }
    throw err;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`模型调用失败：${msg}`);
  }
  const content = String(json?.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("模型返回空内容");
  return content;
}

async function* streamChatModel(cfg, messages, systemPrompt = SYSTEM_PROMPT) {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const body = {
    model: cfg.model,
    temperature: 0.3,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };
  if (inferProviderId(cfg) === "deepseek") {
    body.thinking = { type: "disabled" };
  }
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LLM_STREAM_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw llmTimeoutError(LLM_STREAM_TIMEOUT_MS);
    }
    throw err;
  }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg =
      json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`模型调用失败：${msg}`);
  }
  if (!res.body) throw new Error("模型未返回流");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (err) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        throw llmTimeoutError(LLM_STREAM_TIMEOUT_MS);
      }
      throw err;
    }
    const { done, value } = chunk;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

function parseModelJson(content) {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

function parseChatResult(content) {
  const raw = String(content || "");
  const markerIdx = raw.indexOf(CHAT_JSON_MARKER);
  let reply = "";
  let obj = {};
  if (markerIdx >= 0) {
    reply = raw.slice(0, markerIdx).trim();
    try {
      obj = parseModelJson(raw.slice(markerIdx + CHAT_JSON_MARKER.length));
    } catch {
      obj = {};
    }
  } else {
    try {
      obj = parseModelJson(raw);
      reply = String(obj.reply || "").trim();
    } catch {
      reply = raw.trim();
    }
  }
  return {
    reply: reply || "请继续补充。",
    goal: String(obj.goal || "").trim(),
    outOfScope: String(obj.outOfScope || "").trim(),
    acceptance: String(obj.acceptance || "").trim(),
    assumptions: String(obj.assumptions || "").trim(),
    ready: Boolean(obj.ready),
    options: enrichChatOptions(
      reply || String(obj.reply || ""),
      Array.isArray(obj.options) ? obj.options : [],
    ),
  };
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function streamChatResponse(cfg, messages, res, systemPrompt = SYSTEM_PROMPT) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  let full = "";
  let emitted = 0;
  let inJson = false;
  try {
    for await (const chunk of streamChatModel(cfg, messages, systemPrompt)) {
      full += chunk;
      if (inJson) continue;
      const markerIdx = full.indexOf(CHAT_JSON_MARKER);
      if (markerIdx >= 0) {
        inJson = true;
        const reply = full.slice(0, markerIdx);
        if (reply.length > emitted) {
          writeSse(res, { type: "delta", text: reply.slice(emitted) });
          emitted = reply.length;
        }
        continue;
      }
      const hold = CHAT_JSON_MARKER.length - 1;
      const safeLen = Math.max(0, full.length - hold);
      if (safeLen > emitted) {
        writeSse(res, { type: "delta", text: full.slice(emitted, safeLen) });
        emitted = safeLen;
      }
    }
    const parsed = parseChatResult(full);
    if (!inJson && parsed.reply && emitted < parsed.reply.length) {
      writeSse(res, {
        type: "delta",
        text: parsed.reply.slice(emitted),
      });
    }
    writeSse(res, { type: "done", ...parsed });
  } catch (err) {
    writeSse(res, {
      type: "error",
      error: err instanceof Error ? err.message : "chat failed",
    });
  }
  res.end();
}

function parseAcceptResult(content, fallback) {
  const obj = parseModelJson(content);
  const pick = (key) => {
    const v = String(obj[key] || "").trim();
    return v || String(fallback[key] || "").trim();
  };
  return {
    passed: Boolean(obj.passed),
    summary: String(obj.summary || "").trim(),
    issues: Array.isArray(obj.issues)
      ? obj.issues.map((x) => String(x).trim()).filter(Boolean).slice(0, 8)
      : [],
    goal: pick("goal"),
    outOfScope: pick("outOfScope"),
    acceptance: pick("acceptance"),
    assumptions: pick("assumptions"),
  };
}

function acceptanceLooksCheckable(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  // Observable outcome cues (CN + EN + common commands/paths)
  return /打开|看到|显示|点击|返回|为空|出现|通过|等于|包含|列表|页面|接口|按钮|标题|颜色|导航|首页|登录|公告|截图|对照|#[0-9a-fA-F]{3,8}|npm\s|test:|http|curl|\.html|\.json|passes?\b|shows?\b|returns?\b|opens?\b|click\b|empty\b|status\s*\d{3}|assert\b|expect\b/i.test(
    t,
  );
}

function acceptanceLooksVague(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return /更好用|更好看|更美观|更漂亮|更流畅|优化体验|提升体验|用户满意|看起来不错|(?:^|[\s,.;:，。；])(better|nicer|prettier|more beautiful|improved ux|looks?\s+better|polish(?:ed)?|more polished)(?:$|[\s,.;:])/i.test(
    t,
  );
}

function localAcceptCheck(card) {
  const issues = [];
  const goal = String(card.goal || "").trim();
  const acceptance = String(card.acceptance || "").trim();
  if (goal.length < 8) {
    issues.push("「要做什么」过短，写清单一可执行目标");
  }
  if (acceptance.length < 12) {
    issues.push("「验收标准」过短，写清可核对的完成结果");
  } else if (acceptanceLooksVague(acceptance) && !acceptanceLooksCheckable(acceptance)) {
    issues.push(
      "「验收标准」太空泛（如更好用/更好看）；请写可检查结果：打开何处、看到什么、哪条命令通过",
    );
  } else if (!acceptanceLooksCheckable(acceptance) && acceptance.length < 40) {
    issues.push(
      "「验收标准」须可客观检查（打开/看到/点击/命令通过等），避免无法核对的形容词",
    );
  }
  return issues;
}

async function autoAcceptCard(cfg, card) {
  const local = localAcceptCheck(card);
  if (local.length) {
    return {
      passed: false,
      summary: "本地预检未通过",
      issues: local,
      goal: card.goal,
      outOfScope: card.outOfScope,
      acceptance: card.acceptance,
      assumptions: card.assumptions,
    };
  }
  const content = await callChatModel(
    cfg,
    [
      {
        role: "user",
        content: `请验收以下确认卡：\n${JSON.stringify(card, null, 2)}`,
      },
    ],
    ACCEPT_PROMPT,
  );
  return parseAcceptResult(content, card);
}

/** Validate card without writing Brief — used to gate human confirm/revise send. */
async function validateCardOnly(cfg, card) {
  const normalized = {
    goal: String(card.goal || "").trim(),
    outOfScope: String(card.outOfScope || "").trim(),
    acceptance: String(card.acceptance || "").trim(),
    assumptions: String(card.assumptions || "").trim(),
  };
  if (!normalized.goal || !normalized.acceptance) {
    return {
      passed: false,
      summary: "goal and acceptance are required",
      issues: [
        !normalized.goal ? "「要做什么」不能为空" : null,
        !normalized.acceptance ? "「验收标准」不能为空" : null,
      ].filter(Boolean),
      ...normalized,
    };
  }
  const review = await autoAcceptCard(cfg, normalized);
  return {
    passed: Boolean(review.passed),
    summary: review.summary || (review.passed ? "自动验收通过" : "自动验收未通过"),
    issues: review.issues || [],
    goal: review.goal,
    outOfScope: review.outOfScope,
    acceptance: review.acceptance,
    assumptions: review.assumptions,
  };
}

class ValidateGateError extends Error {
  constructor(review) {
    super(review?.summary || "自动验收未通过");
    this.name = "ValidateGateError";
    this.code = "VALIDATE_GATE";
    this.review = review || null;
  }
}

async function autoFixConfirmCard(cfg, card, issues) {
  const content = await callChatModel(
    cfg,
    [
      {
        role: "user",
        content: `确认卡：\n${JSON.stringify(card, null, 2)}\n\n未通过原因 issues：\n${JSON.stringify(issues || [], null, 2)}\n\n请修订四块。`,
      },
    ],
    FIX_ACCEPT_PROMPT,
  );
  let obj = {};
  try {
    obj = parseModelJson(content);
  } catch {
    obj = {};
  }
  return {
    summary: String(obj.summary || "已按 issues 修订确认卡").trim(),
    goal: String(obj.goal || card.goal || "").trim(),
    outOfScope: String(obj.outOfScope || card.outOfScope || "").trim(),
    acceptance: String(obj.acceptance || card.acceptance || "").trim(),
    assumptions: String(obj.assumptions || card.assumptions || "").trim(),
  };
}

function writeBrief(payload) {
  const goal = String(payload.goal || "").trim();
  const outOfScope = String(payload.outOfScope || "").trim();
  const acceptance = String(payload.acceptance || "").trim();
  const assumptions = String(payload.assumptions || "").trim();
  const rawAsk = String(payload.rawAsk || "").trim();
  const review = payload.review && typeof payload.review === "object" ? payload.review : null;
  const projectPath = normalizeProjectKey(
    payload.projectPath || payload.repoPath || "",
  );
  if (!goal || !acceptance) throw new Error("goal and acceptance are required");

  const { root, nextNum } = nextJobDir();
  const slug = slugify(goal);
  const dirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(root, dirName);
  fs.mkdirSync(featureDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const branchHint = `feat/${dirName}`;
  const reviewBlock = review
    ? `

## Auto-accept

- Passed: yes
- Summary: ${review.summary || "ok"}
`
    : "";
  const spec = `# Feature Specification: ${goal}

**Feature Branch**: \`${branchHint}\`

**Created**: ${today}

**Status**: Confirmed (Duaer-spec FED)

**Input**: ${rawAsk || goal}

## Goal

${goal}

## Out of scope

${outOfScope || "- (none listed)"}

## Acceptance

${acceptance}

## Assumptions

${assumptions || "- (none)"}
${reviewBlock}
## Notes

Confirmed via Duaer-spec FED after auto-accept. Next: dispatch into a product repo worktree from the live desk.
`;

  const tasks = `# Tasks

- [ ] T001 Implement against this Brief in the request worktree
- [ ] T002 Risk-based verification per \`.duaer/memory/testing.md\`
- [ ] T003 Stamp \`delivery.json\` accepted (with verification evidence or waiver)
`;

  fs.writeFileSync(path.join(featureDir, "spec.md"), spec, "utf8");
  fs.writeFileSync(path.join(featureDir, "tasks.md"), tasks, "utf8");
  fs.writeFileSync(
    path.join(featureDir, "job.json"),
        `${JSON.stringify(
      {
        id: dirName,
        branch: branchHint,
        confirmedAt: new Date().toISOString(),
        source: "live-dev",
        status: "confirmed",
        projectPath: projectPath || null,
        repoPath: projectPath || null,
        autoAccept: review
          ? {
              passed: true,
              summary: review.summary || "",
              reviewedAt: new Date().toISOString(),
            }
          : undefined,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const agentPrompt = `Duaer-spec FED 已确认需求（隔离区 Brief）。下一步在页面选择产品仓库派工，或手动：

Brief: ${featureDir}
分支建议: ${branchHint}
${projectPath ? `产品项目: ${projectPath}\n` : ""}`;

  return {
    ok: true,
    jobId: dirName,
    featureDir,
    relativeDir: `~/.duaer/live/jobs/${dirName}`,
    branch: branchHint,
    projectPath: projectPath || null,
    agentPrompt,
    review: review
      ? { passed: true, summary: review.summary || "" }
      : undefined,
  };
}

function reposFile() {
  return path.join(liveRoot(), "repos.json");
}

function readRepos() {
  ensureLiveDirs();
  const p = reposFile();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(raw.repos) ? raw.repos : [];
  } catch {
    return [];
  }
}

function normalizeRepoPath(repoPath) {
  return path.resolve(
    String(repoPath || "")
      .trim()
      .replace(/[\\/]+$/, "") || ".",
  );
}

function rememberRepo(repoPath, extra = {}) {
  const abs = normalizeRepoPath(repoPath);
  const prev = readRepos().find((r) => normalizeRepoPath(r.path) === abs) || {};
  const title = String(extra.title ?? extra.name ?? prev.title ?? prev.name ?? "")
    .trim();
  const description = String(
    extra.description !== undefined ? extra.description : prev.description || "",
  ).trim();
  const displayName = title || path.basename(abs) || abs;
  const next = [
    {
      path: abs,
      name: displayName,
      title: displayName,
      description,
      lastUsedAt: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(extra).filter(
          ([k]) => !["title", "name", "description", "path", "lastUsedAt"].includes(k),
        ),
      ),
    },
    ...readRepos().filter((r) => normalizeRepoPath(r.path) !== abs),
  ].slice(0, 40);
  fs.writeFileSync(
    reposFile(),
    `${JSON.stringify({ repos: next }, null, 2)}\n`,
    "utf8",
  );
  return next;
}

function discoverRoots() {
  const home = os.homedir();
  const roots = new Set([
    path.join(home, "Projects"),
    path.join(home, "projects"),
    path.join(home, "Developer"),
    path.join(home, "dev"),
    path.join(home, "code"),
    path.join(home, "src"),
    path.join(home, "workspace"),
    path.join(home, "work"),
    home,
  ]);
  const projectsRoot = String(readConfig().projectsRoot || "").trim();
  if (projectsRoot) roots.add(path.resolve(projectsRoot));
  for (const r of readRepos()) {
    if (r?.path) roots.add(path.dirname(r.path));
  }
  return [...roots].filter((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

function looksLikeGitRepo(dir) {
  const gitPath = path.join(dir, ".git");
  return fs.existsSync(gitPath);
}

function discoverRepos({ max = 40 } = {}) {
  const found = new Map();
  const skip = new Set([
    "node_modules",
    ".git",
    ".worktree",
    "Library",
    "Applications",
    ".Trash",
    "Caches",
  ]);

  function visit(dir, depth, fromHomeRoot) {
    if (found.size >= max) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (found.size >= max) return;
      if (!ent.isDirectory()) continue;
      if (ent.name.startsWith(".") && ent.name !== ".duaer") continue;
      if (skip.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (looksLikeGitRepo(full)) {
        try {
          const probe = probeRepo(full);
          found.set(probe.path, {
            path: probe.path,
            name: probe.name,
            baseBranch: probe.baseBranch,
            source: "discover",
          });
        } catch {
          // skip invalid / no develop|main
        }
        continue;
      }
      // Do not deep-walk all of $HOME — only one level under home itself.
      const nextDepth = depth + 1;
      if (fromHomeRoot && nextDepth > 1) continue;
      if (nextDepth > 2) continue;
      visit(full, nextDepth, fromHomeRoot);
    }
  }

  const home = os.homedir();
  for (const root of discoverRoots()) {
    const fromHomeRoot = path.resolve(root) === path.resolve(home);
    // If root itself is a repo, include it.
    if (looksLikeGitRepo(root)) {
      try {
        const probe = probeRepo(root);
        found.set(probe.path, {
          path: probe.path,
          name: probe.name,
          baseBranch: probe.baseBranch,
          source: "discover",
        });
      } catch {
        // ignore
      }
    }
    visit(root, 0, fromHomeRoot);
  }

  return [...found.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  );
}

function pickFolderNative() {
  if (process.platform === "darwin") {
    const r = spawnSync(
      "osascript",
      ["-e", 'POSIX path of (choose folder with prompt "选择产品仓库")'],
      { encoding: "utf8", timeout: 300000 },
    );
    const err = String(r.stderr || "").trim();
    const out = String(r.stdout || "").trim();
    if (r.status !== 0) {
      if (
        /User canceled|cancelled|canceled|取消/i.test(err) ||
        /User canceled|cancelled|canceled|取消/i.test(out)
      ) {
        const e = new Error("已取消选择");
        e.code = "CANCELLED";
        throw e;
      }
      throw new Error(err || out || "无法打开系统文件夹选择");
    }
    if (!out) {
      const e = new Error("已取消选择");
      e.code = "CANCELLED";
      throw e;
    }
    return normalizeRepoPath(out);
  }
  if (process.platform === "linux") {
    const r = spawnSync(
      "zenity",
      ["--file-selection", "--directory", "--title=选择产品仓库"],
      { encoding: "utf8", timeout: 300000 },
    );
    if (r.status !== 0) {
      const e = new Error("已取消选择");
      e.code = "CANCELLED";
      throw e;
    }
    return normalizeRepoPath(String(r.stdout || "").trim());
  }
  const e = new Error(
    "当前系统暂不支持弹窗选文件夹，请用扫描列表或：duaer live repo add",
  );
  e.code = "UNSUPPORTED";
  throw e;
}

function listReposForUi() {
  const recent = readRepos();
  const recentPaths = new Set(recent.map((r) => r.path));
  return {
    recent,
    discovered: discoverRepos().filter((r) => !recentPaths.has(r.path)),
  };
}

function cmdRepoAdd(opts) {
  const target = path.resolve(opts.repoPath || process.cwd());
  const probe = probeRepo(target, {
    bootstrap: true,
    exact: true,
    ensureDuaer: true,
  });
  rememberRepo(probe.path, { baseBranch: probe.baseBranch });
  const bits = [];
  if (probe.bootstrapped) bits.push("已 git init");
  if (probe.duaer?.action === "init") bits.push("已安装 Duaer");
  console.log(
    bits.length ? `${bits.join(" · ")} 并登记` : "已登记产品仓库",
    probe.path,
  );
  console.log(JSON.stringify(probe, null, 2));
  console.log("Duaer-spec FED 派工时可直接点选。");
}

/**
 * Child processes below run on the single HTTP thread, so an unbounded one
 * freezes every endpoint — not just the request that started it. Every
 * spawnSync goes through here with a budget.
 */
const CHILD_BUDGET_MS = {
  git: 20000,
  gitCheckout: 60000,
  duaerInit: 120000,
  which: 5000,
};

function runChildSync(label, command, args, options = {}) {
  const { timeout, ...rest } = options;
  const r = spawnSync(command, args, {
    ...rest,
    timeout,
    killSignal: "SIGKILL",
  });
  if (r.error) {
    if (r.error.code === "ETIMEDOUT") {
      const e = new Error(
        `${label}超过 ${Math.round(timeout / 1000)} 秒仍未结束，已强制中止：` +
          `${command} ${args.join(" ")}。` +
          `常见原因：git 钩子卡住、仓库太大、磁盘或网络不可用。`,
      );
      e.code = "CHILD_TIMEOUT";
      throw e;
    }
    throw r.error;
  }
  return r;
}

function runGit(cwd, args, envExtra = null, { timeout = CHILD_BUDGET_MS.git } = {}) {
  const r = runChildSync(`git ${args[0] || ""}`.trim(), "git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    env: envExtra ? { ...process.env, ...envExtra } : process.env,
    timeout,
  });
  if (r.status !== 0) {
    throw new Error(
      String(r.stderr || r.stdout || `git ${args.join(" ")} failed`).trim(),
    );
  }
  return String(r.stdout || "").trim();
}

function hasLocalBranch(cwd, name) {
  const r = runChildSync(
    "git show-ref",
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${name}`],
    { cwd, timeout: CHILD_BUDGET_MS.git },
  );
  return r.status === 0;
}

function hasGitDir(dir) {
  try {
    return fs.existsSync(path.join(dir, ".git"));
  } catch {
    return false;
  }
}

function tryGitTop(dir) {
  let r;
  try {
    r = runChildSync("git rev-parse", "git", ["rev-parse", "--show-toplevel"], {
      cwd: dir,
      encoding: "utf8",
      timeout: CHILD_BUDGET_MS.git,
    });
  } catch {
    return null;
  }
  if (r.status !== 0) return null;
  return normalizeRepoPath(String(r.stdout || "").trim());
}

function listChildGitRepos(dir, { max = 12 } = {}) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (out.length >= max) break;
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith(".")) continue;
    if (["node_modules", "Library", "Applications"].includes(ent.name)) {
      continue;
    }
    const full = path.join(dir, ent.name);
    if (!hasGitDir(full)) continue;
    const top = tryGitTop(full);
    if (top) out.push(top);
  }
  return out;
}

function resolveGitTop(repoPath, { exact = false } = {}) {
  const abs = normalizeRepoPath(repoPath);
  if (!abs || abs === path.sep) throw new Error("请填写仓库绝对路径");
  if (!fs.existsSync(abs)) throw new Error(`路径不存在：${abs}`);

  // 1) This folder (or inside a repo)
  let top = tryGitTop(abs);
  if (top) return top;

  // 2) Walk up — user may have picked src/ or packages/foo
  //    Skip when exact: stay on the chosen folder (bootstrap there instead).
  if (!exact) {
    let cur = abs;
    for (let i = 0; i < 8; i += 1) {
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
      if (!hasGitDir(cur)) continue;
      top = tryGitTop(cur);
      if (top) return top;
    }

    // 3) Immediate children — user picked parent of the real repo
    const kids = listChildGitRepos(abs);
    if (kids.length === 1) return kids[0];
    if (kids.length > 1) {
      const e = new Error(
        `你选的是父目录，下面有多个 git 仓库。请再选其中一个项目文件夹：${kids
          .map((k) => path.basename(k))
          .join("、")}`,
      );
      e.code = "AMBIGUOUS_PARENT";
      e.candidates = kids.map((p) => ({
        path: p,
        name: path.basename(p),
      }));
      e.path = abs;
      throw e;
    }
  }

  const e = new Error(
    exact
      ? `「${abs}」不是 git 仓库。将在该目录执行 git init（不会改用其它子目录里的仓库）。`
      : `「${abs}」不是 git 仓库（没有 .git）。有文件不等于已 git init——请选带 .git 的项目根目录，或在该目录执行：git init -b develop && git add -A && git commit -m init`,
  );
  e.code = "NOT_GIT";
  e.path = abs;
  throw e;
}

function bootstrapGitRepo(repoPath) {
  const abs = normalizeRepoPath(repoPath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`路径不存在或不是目录：${abs}`);
  }
  const home = normalizeRepoPath(os.homedir());
  if (abs === home || abs === path.parse(abs).root) {
    throw new Error("不能在用户主目录或磁盘根目录自动 git init，请选具体项目文件夹");
  }
  ensureGitInstalled(whichCmd, runChildSync);
  if (hasGitDir(abs) || tryGitTop(abs)) {
    return abs;
  }
  // Prefer develop as default branch (git 2.28+); fall back for older git.
  try {
    runGit(abs, ["init", "-b", "develop"]);
  } catch {
    runGit(abs, ["init"]);
    try {
      runGit(abs, ["checkout", "-b", "develop"]);
    } catch {
      // stay on default branch name; probe accepts main/master too
    }
  }
  try {
    runGit(abs, ["add", "-A"]);
  } catch {
    // ignore add failures (empty / permission on some files)
  }
  const identity = {
    GIT_AUTHOR_NAME: "duaer-live",
    GIT_AUTHOR_EMAIL: "duaer-live@localhost",
    GIT_COMMITTER_NAME: "duaer-live",
    GIT_COMMITTER_EMAIL: "duaer-live@localhost",
  };
  runGit(abs, ["commit", "--allow-empty", "-m", "chore: init repository"], identity);
  return abs;
}

function ensureBaseBranch(top, { bootstrap = false } = {}) {
  for (const b of ["develop", "main", "master"]) {
    if (hasLocalBranch(top, b)) {
      return { baseBranch: b, created: false };
    }
  }
  if (!bootstrap) {
    const e = new Error(
      `「${top}」是 git 仓库，但本地没有 develop / main / master 分支`,
    );
    e.code = "NO_BASE_BRANCH";
    e.path = top;
    throw e;
  }

  const identity = {
    GIT_AUTHOR_NAME: "duaer-live",
    GIT_AUTHOR_EMAIL: "duaer-live@localhost",
    GIT_COMMITTER_NAME: "duaer-live",
    GIT_COMMITTER_EMAIL: "duaer-live@localhost",
  };
  const headOk =
    runChildSync("git rev-parse", "git", ["rev-parse", "-q", "--verify", "HEAD"], {
      cwd: top,
      timeout: CHILD_BUDGET_MS.git,
    }).status === 0;

  if (headOk) {
    // Create develop from current HEAD without switching the user's checkout.
    runGit(top, ["branch", "develop", "HEAD"]);
    return { baseBranch: "develop", created: true };
  }

  // Unborn HEAD: make an empty commit on develop.
  try {
    runGit(top, ["checkout", "-b", "develop"]);
  } catch {
    try {
      runGit(top, ["branch", "-M", "develop"]);
    } catch {
      // continue; commit may still create the branch tip
    }
  }
  try {
    runGit(top, ["add", "-A"]);
  } catch {
    // ignore
  }
  runGit(
    top,
    ["commit", "--allow-empty", "-m", "chore: init develop branch"],
    identity,
  );
  if (!hasLocalBranch(top, "develop")) {
    runGit(top, ["branch", "-M", "develop"]);
  }
  return { baseBranch: "develop", created: true };
}

function probeRepo(
  repoPath,
  { bootstrap = false, exact = false, ensureDuaer = false } = {},
) {
  ensureGitInstalled(whichCmd, runChildSync);
  const abs = resolveProductRepoPath(repoPath, {
    projectsRoot: readConfig().projectsRoot,
  });
  const ensured = ensureProductDir(abs);
  let bootstrapped = Boolean(ensured.created);
  let top;
  try {
    top = resolveGitTop(abs, { exact });
  } catch (err) {
    if (!bootstrap || err?.code !== "NOT_GIT" || !err.path) throw err;
    // Do not bootstrap home / obvious parent folders with many children.
    // When exact, still allow empty chosen folders (no silent child redirect).
    if (!exact) {
      const kids = listChildGitRepos(err.path, { max: 3 });
      if (kids.length > 0) throw err;
    }
    bootstrapGitRepo(err.path);
    bootstrapped = true;
    top = resolveGitTop(err.path, { exact: true });
  }
  const base = ensureBaseBranch(top, { bootstrap });
  if (base.created) bootstrapped = true;
  let duaer = null;
  if (ensureDuaer) {
    duaer = ensureDuaerInstalled(top);
  }
  return {
    path: top,
    name: path.basename(top) || top,
    baseBranch: base.baseBranch,
    hasDuaer: hasDuaerInstall(top),
    bootstrapped,
    dirCreated: Boolean(ensured.created),
    baseBranchCreated: base.created,
    duaer,
  };
}

/** True when this directory already has a Duaer product install. */
function hasDuaerInstall(dir) {
  const abs = path.resolve(dir);
  return (
    fs.existsSync(path.join(abs, ".duaer", "duaer-init.json")) ||
    fs.existsSync(path.join(abs, "AGENTS.md")) ||
    fs.existsSync(path.join(abs, ".duaer", "memory", "testing.md"))
  );
}

/**
 * Run `duaer init --here` in the given directory when Duaer is missing.
 * Always uses this path — never another repo.
 */
function ensureDuaerInstalled(targetDir) {
  const abs = path.resolve(targetDir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    throw new Error(`路径不存在或不是目录：${abs}`);
  }
  if (hasDuaerInstall(abs)) {
    return { path: abs, action: "already", ok: true };
  }
  const script = path.join(PACKAGE_ROOT, "bin", "duaer.mjs");
  if (!fs.existsSync(script)) {
    throw new Error(`duaer CLI missing at ${script}`);
  }
  const r = runChildSync("安装 Duaer", process.execPath, [script, "init", "--here"], {
    cwd: abs,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
    timeout: CHILD_BUDGET_MS.duaerInit,
  });
  if (r.status !== 0) {
    const detail = String(r.stderr || r.stdout || "")
      .trim()
      .slice(0, 800);
    throw new Error(
      `在指定目录安装 Duaer 失败（${abs}）：${detail || `exit ${r.status}`}`,
    );
  }
  if (!hasDuaerInstall(abs)) {
    throw new Error(`Duaer init 已运行，但指定目录仍缺少 AGENTS.md / .duaer：${abs}`);
  }
  return { path: abs, action: "init", ok: true };
}

function nextSpecNum(specsRoot) {
  fs.mkdirSync(specsRoot, { recursive: true });
  const existing = fs.readdirSync(specsRoot).filter((n) => /^\d{3}-/.test(n));
  let max = 0;
  for (const name of existing) {
    const n = Number(name.slice(0, 3));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

function readLiveJob(jobId) {
  const id = String(jobId || "").trim();
  if (!id) throw new Error("jobId required");
  const featureDir = path.join(jobsRoot(), id);
  if (!fs.existsSync(featureDir)) throw new Error(`找不到 live job：${id}`);
  const jobPath = path.join(featureDir, "job.json");
  const job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
  return {
    id,
    featureDir,
    job,
    jobPath,
    spec: fs.readFileSync(path.join(featureDir, "spec.md"), "utf8"),
    tasks: fs.existsSync(path.join(featureDir, "tasks.md"))
      ? fs.readFileSync(path.join(featureDir, "tasks.md"), "utf8")
      : "",
  };
}

function jobTitleFromSpec(specMd) {
  const m = String(specMd || "").match(/^#\s+Feature Specification:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

function listProjectsPayload() {
  const cfg = readConfig();
  const jobs = listLiveJobs({ limit: 100 });
  const bag = buildProjectList({
    repos: readRepos(),
    jobs,
    activeProjectPath: cfg.activeProjectPath,
  });
  return {
    ...bag,
    projectsRoot: cfg.projectsRoot || "",
    activeProjectPath: cfg.activeProjectPath || null,
  };
}

/**
 * Select or create a product project and set it active.
 * @param {{
 *   path?: string,
 *   name?: string,
 *   title?: string,
 *   description?: string,
 *   requireMeta?: boolean,
 * }} body
 */
function activateProject(body = {}) {
  const cfg = readConfig();
  let raw = String(body.path || body.name || "").trim();
  if (!raw) {
    const e = new Error("请填写目录名或绝对路径");
    e.code = "EMPTY_PATH";
    throw e;
  }
  const titleIn = String(body.title || "").trim();
  const descriptionIn = String(body.description || "").trim();
  const abs = resolveProductRepoPath(raw, {
    projectsRoot: cfg.projectsRoot,
  });
  const ensured = ensureProductDir(abs);
  const existing = readRepos().find(
    (r) => normalizeRepoPath(r.path) === normalizeRepoPath(abs),
  );
  const isNew = Boolean(ensured.created) || !existing;
  const needMeta = Boolean(body.requireMeta) || isNew;
  if (needMeta && !titleIn) {
    const e = new Error("请填写项目名称");
    e.code = "NEED_TITLE";
    throw e;
  }
  if (needMeta && !descriptionIn) {
    const e = new Error("请填写简单的背景描述");
    e.code = "NEED_DESCRIPTION";
    throw e;
  }
  const probe = probeRepo(ensured.path, {
    bootstrap: true,
    exact: true,
    ensureDuaer: false,
  });
  const savedTitle =
    titleIn ||
    existing?.title ||
    existing?.name ||
    path.basename(probe.path);
  const savedDesc = descriptionIn || existing?.description || "";
  rememberRepo(probe.path, {
    title: savedTitle,
    name: savedTitle,
    description: savedDesc,
  });
  const next = writeConfig({ activeProjectPath: probe.path });
  return {
    ok: true,
    path: probe.path,
    name: savedTitle,
    title: savedTitle,
    description: savedDesc,
    created: Boolean(ensured.created),
    ...publicConfig(next),
    ...listProjectsPayload(),
  };
}

/** Newest-first list of live jobs for history UI. */
function listLiveJobs({ limit = 40 } = {}) {
  ensureLiveDirs();
  const root = jobsRoot();
  const max = Math.min(Math.max(Number(limit) || 40, 1), 100);
  let names = [];
  try {
    names = fs.readdirSync(root).filter((n) => {
      try {
        return fs.statSync(path.join(root, n)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }

  const rows = [];
  for (const id of names) {
    const jobPath = path.join(root, id, "job.json");
    const specPath = path.join(root, id, "spec.md");
    if (!fs.existsSync(jobPath)) continue;
    let job = {};
    let spec = "";
    try {
      job = JSON.parse(fs.readFileSync(jobPath, "utf8"));
    } catch {
      continue;
    }
    try {
      if (fs.existsSync(specPath)) spec = fs.readFileSync(specPath, "utf8");
    } catch {
      spec = "";
    }
    const goal =
      extractSection(spec, "Goal").split(/\n/)[0]?.trim() ||
      jobTitleFromSpec(spec) ||
      id;
    const at =
      job.dispatch?.revisedAt ||
      job.revisedAt ||
      job.dispatch?.dispatchedAt ||
      job.confirmedAt ||
      null;
    rows.push({
      id,
      goal: goal.slice(0, 200),
      status: job.status || "unknown",
      confirmedAt: job.confirmedAt || null,
      dispatchedAt: job.dispatch?.dispatchedAt || null,
      revisedAt: job.dispatch?.revisedAt || job.revisedAt || null,
      at,
      revisionCount: Number(job.revisionCount || 0),
      repoPath:
        job.dispatch?.repoPath || job.projectPath || job.repoPath || null,
      worktreePath: job.dispatch?.worktreePath || null,
      branch: job.dispatch?.branch || job.branch || null,
    });
  }

  rows.sort((a, b) => {
    const ta = Date.parse(a.at || a.confirmedAt || "") || 0;
    const tb = Date.parse(b.at || b.confirmedAt || "") || 0;
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  });
  return rows.slice(0, max);
}

function liveJobDetail(jobId) {
  const live = readLiveJob(jobId);
  const goal = extractSection(live.spec, "Goal");
  const outOfScope = extractSection(live.spec, "Out of Scope");
  const acceptance = extractSection(live.spec, "Acceptance");
  const assumptions = extractSection(live.spec, "Assumptions");
  let statusPayload = null;
  try {
    statusPayload = dispatchStatus(live.id);
  } catch {
    statusPayload = null;
  }
  return {
    id: live.id,
    jobStatus: live.job.status || "unknown",
    confirmedAt: live.job.confirmedAt || null,
    branch: live.job.branch || null,
    goal: goal || jobTitleFromSpec(live.spec) || live.id,
    outOfScope,
    acceptance,
    assumptions,
    revisionCount: Number(live.job.revisionCount || 0),
    revisions: Array.isArray(live.job.revisions) ? live.job.revisions : [],
    projectPath: live.job.projectPath || live.job.repoPath || null,
    repoPath:
      live.job.dispatch?.repoPath ||
      live.job.projectPath ||
      live.job.repoPath ||
      null,
    dispatch: live.job.dispatch || null,
    card: {
      goal: goal.split(/\n\n/)[0]?.trim() || goal || live.id,
      outOfScope: outOfScope || "",
      acceptance: acceptance || "",
      assumptions: assumptions || "",
    },
    status: statusPayload || {
      jobId: live.id,
      status: live.job.status || "unknown",
      delivery: null,
      progress: null,
      preview: null,
    },
  };
}

function whichCmd(cmd) {
  const name = String(cmd || "").trim();
  if (!name || name.includes("/") || name.includes("\\")) return null;
  try {
    const r = runChildSync("which", "which", [name], {
      encoding: "utf8",
      env: process.env,
      timeout: CHILD_BUDGET_MS.which,
    });
    if (r.status === 0) {
      const p = String(r.stdout || "")
        .trim()
        .split("\n")[0];
      if (p) return p;
    }
  } catch {
    // fall through to the PATH scan below
  }
  // Fallback when `which` is missing or PATH still incomplete (e.g. launchd)
  for (const dir of cliSearchDirs()) {
    const full = path.join(dir, name);
    try {
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        // Follow symlink targets that are executable files
        fs.accessSync(full, fs.constants.X_OK);
        return full;
      }
    } catch {
      // not executable / not readable
    }
  }
  return null;
}

/** CLI-only digital-employee launchers (Terminal). */
const CURSOR_INSTALL_CMD = TOOLING_CURSOR_INSTALL;

const AGENT_CATALOG = [
  {
    id: "cursor-agent",
    label: "Cursor Agent",
    kind: "worker",
    hint: "Terminal 执行 agent / cursor agent",
    installCommand: CURSOR_INSTALL_CMD,
  },
  {
    id: "claude",
    label: "Claude Code",
    kind: "worker",
    hint: "Terminal 执行 claude CLI",
    installCommand:
      "查看 https://docs.anthropic.com/en/docs/claude-code/overview 安装 Claude Code CLI；已安装可执行 claude update",
  },
];

function cursorCliVersion() {
  const bin = whichCmd("agent") || whichCmd("cursor");
  if (!bin) return null;
  let r;
  try {
    r = runChildSync(
      "读取 CLI 版本",
      bin,
      whichCmd("agent") ? ["--version"] : ["agent", "--version"],
      { encoding: "utf8", timeout: 5000 },
    );
  } catch {
    return null;
  }
  if (r.status !== 0) return null;
  return String(r.stdout || r.stderr || "")
    .trim()
    .split("\n")[0]
    .slice(0, 120);
}

function claudeCliVersion() {
  const bin = whichCmd("claude");
  if (!bin) return null;
  let r;
  try {
    r = runChildSync("读取 Claude CLI 版本", bin, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
    });
  } catch {
    return null;
  }
  if (r.status !== 0) return null;
  return String(r.stdout || r.stderr || "")
    .trim()
    .split("\n")[0]
    .slice(0, 120);
}

function scheduleWorkerCliRefresh({ force = false } = {}) {
  if (process.env.DUAER_NO_CLI_UPGRADE === "1") return;
  try {
    const args = [path.join(__dirname, "live-tooling.mjs"), "--refresh-clis"];
    if (force) args.push("--force");
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
  } catch (err) {
    console.warn(
      "Worker CLI schedule failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

function detectAgents() {
  const preferredRaw = readConfig().preferredAgentId || "";
  const preferredMeta = AGENT_CATALOG.find((a) => a.id === preferredRaw);
  const preferred = preferredMeta ? preferredRaw : "";
  const agentBin = whichCmd("agent");
  const cursorBin = whichCmd("cursor");
  const claudeBin = whichCmd("claude");
  const version = cursorCliVersion();
  const claudeVersion = claudeCliVersion();

  const installed = [];
  if (agentBin || cursorBin) {
    installed.push({
      ...AGENT_CATALOG.find((a) => a.id === "cursor-agent"),
      available: true,
      command: agentBin ? "agent" : "cursor agent",
      path: agentBin || cursorBin,
      version,
    });
  }
  if (claudeBin) {
    installed.push({
      ...AGENT_CATALOG.find((a) => a.id === "claude"),
      available: true,
      command: "claude",
      path: claudeBin,
      version: claudeVersion,
    });
  }

  const ids = new Set(installed.map((a) => a.id));
  const missing = AGENT_CATALOG.filter((a) => !ids.has(a.id)).map((a) => ({
    ...a,
    available: false,
    command: null,
    path: null,
    installCommand: a.installCommand || null,
  }));

  return {
    preferredAgentId: preferred && ids.has(preferred) ? preferred : "",
    agents: installed,
    missing,
    cli: {
      cursor: cursorBin,
      agent: agentBin,
      claude: claudeBin,
      version,
      claudeVersion,
    },
  };
}

function appendLaunchLog(logPath, line) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, "utf8");
}

function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function appleScriptString(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Open a visible Terminal and run the Cursor CLI command.
 * Never block the HTTP thread (no spawnSync / no waiting on osascript).
 * macOS: write `.command` and `open` it asynchronously.
 *
 * When `reuseKey` is set (typically the worktree path), subsequent launches
 * enqueue into the same Terminal runner instead of opening a new window.
 */
function terminalQueueDir(worktreePath) {
  return path.join(worktreePath, ".duaer", "live-terminal");
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

/** Runner is healthy only with a live PID and a fresh heartbeat (or busy running.cmd). */
const RUNNER_HEARTBEAT_MAX_MS = 5000;

function readRunnerPid(queueDir) {
  const pidPath = path.join(queueDir, "runner.pid");
  if (!fs.existsSync(pidPath)) return null;
  const pid = Number(String(fs.readFileSync(pidPath, "utf8")).trim());
  if (!Number.isFinite(pid) || pid <= 0) return null;
  return pid;
}

function isTerminalRunnerHealthy(queueDir) {
  const pid = readRunnerPid(queueDir);
  if (pid == null || !isPidAlive(pid)) return false;
  const runningPath = path.join(queueDir, "running.cmd");
  if (fs.existsSync(runningPath)) return true;
  const hbPath = path.join(queueDir, "runner.heartbeat");
  if (!fs.existsSync(hbPath)) return false;
  try {
    const age = Date.now() - fs.statSync(hbPath).mtimeMs;
    return age >= 0 && age <= RUNNER_HEARTBEAT_MAX_MS;
  } catch {
    return false;
  }
}

function clearStaleRunnerPid(queueDir) {
  const pidPath = path.join(queueDir, "runner.pid");
  try {
    if (fs.existsSync(pidPath)) fs.unlinkSync(pidPath);
  } catch {
    // ignore
  }
  const lockDir = path.join(queueDir, "runner.lock.d");
  try {
    if (fs.existsSync(lockDir)) fs.rmdirSync(lockDir);
  } catch {
    // ignore — live runner still holds it
  }
}

function isTerminalRunnerBusy(queueDir) {
  return fs.existsSync(path.join(queueDir, "running.cmd"));
}

/** Brief pause between SIGTERM and SIGKILL during preempt. */
function sleepBriefMs(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    try {
      spawnSync("sleep", [String(ms / 1000)], {
        encoding: "utf8",
        timeout: Math.max(1000, ms + 500),
      });
    } catch {
      // ignore
    }
  }
}

function isProtectedRunnerCmdLine(cmd) {
  return (
    cmd.includes("runner.command") ||
    cmd.includes("live-terminal/runner")
  );
}

function isWorktreeAgentCmdLine(cmd, worktreePath) {
  if (!cmd || !worktreePath) return false;
  if (!cmd.includes(worktreePath)) return false;
  if (isProtectedRunnerCmdLine(cmd)) return false;
  return (
    cmd.includes("cursor-agent") ||
    /(^|[\s/])claude([\s]|$)/.test(cmd) ||
    /(^|[\s/])agent([\s]|$)/.test(cmd) ||
    cmd.includes("/bin/agent") ||
    cmd.includes(".local/bin/agent")
  );
}

/**
 * Enumerate agent/claude/cursor-agent PIDs scoped to a worktree path.
 * Never matches the long-lived Terminal runner alone.
 */
function listWorktreeAgentPids(worktreePath) {
  const wt = String(worktreePath || "").trim();
  if (!wt) return [];
  const found = new Map(); // pid -> cmdline snippet
  const ingest = (text) => {
    for (const line of String(text || "").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const m = trimmed.match(/^(\d+)\s+(.*)$/);
      if (!m) continue;
      const pid = Number(m[1]);
      const cmd = m[2];
      if (!Number.isFinite(pid) || pid <= 1) continue;
      if (!isWorktreeAgentCmdLine(cmd, wt)) continue;
      found.set(pid, cmd.slice(0, 180));
    }
  };
  try {
    const pgrep = spawnSync("pgrep", ["-lf", wt], {
      encoding: "utf8",
      timeout: CHILD_BUDGET_MS.which,
    });
    if (pgrep.status === 0 || pgrep.stdout) ingest(pgrep.stdout);
  } catch {
    // ignore
  }
  if (found.size === 0) {
    try {
      const ps = spawnSync("ps", ["-ax", "-o", "pid=,command="], {
        encoding: "utf8",
        timeout: CHILD_BUDGET_MS.which,
        maxBuffer: 8 * 1024 * 1024,
      });
      if (ps.stdout) ingest(ps.stdout);
    } catch {
      // ignore
    }
  }
  return [...found.entries()].map(([pid, cmd]) => ({ pid, cmd }));
}

function signalPid(pid, signal) {
  // Prefer Node signals (SIGTERM/SIGKILL); kill(1) gets TERM/KILL.
  const nodeSig = signal.startsWith("SIG") ? signal : `SIG${signal}`;
  const killArg = signal.startsWith("SIG") ? signal.slice(3) : signal;
  try {
    process.kill(pid, nodeSig);
    return true;
  } catch (err) {
    if (err && err.code === "ESRCH") return false;
    try {
      const r = spawnSync("kill", [`-${killArg}`, String(pid)], {
        encoding: "utf8",
        timeout: CHILD_BUDGET_MS.which,
      });
      return r.status === 0;
    } catch {
      return false;
    }
  }
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * After delivery is accepted, the first agent CLI often keeps running.
 * priorAccepted revise must not sit forever behind that leftover process.
 * SIGTERM the bash holding running.cmd, then TERM/KILL worktree-scoped
 * agent/claude orphans (never the Terminal runner.command). Leave
 * running.cmd on disk for the long-lived runner to clean up.
 */
function preemptBusyTerminalJob(queueDir, { worktreePath = null, logPath = null } = {}) {
  const runningPath = path.join(queueDir, "running.cmd");
  if (!fs.existsSync(runningPath)) {
    return { preempted: false, reason: "idle" };
  }
  const stamp = new Date().toISOString();
  if (logPath) {
    appendLaunchLog(
      logPath,
      `[${stamp}] preempt busy runner — priorAccepted revise must not wait forever behind leftover agent`,
    );
  }
  const killed = [];
  try {
    const pkill = spawnSync(
      "pkill",
      ["-TERM", "-f", runningPath],
      { encoding: "utf8", timeout: CHILD_BUDGET_MS.which },
    );
    if (pkill.status === 0) killed.push("running.cmd");
  } catch {
    // ignore
  }

  const agentTargets = worktreePath ? listWorktreeAgentPids(worktreePath) : [];
  for (const { pid, cmd } of agentTargets) {
    if (logPath) {
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] preempt SIGTERM pid=${pid} cmd=${cmd}`,
      );
    }
    if (signalPid(pid, "SIGTERM")) {
      killed.push(`term:${pid}`);
    }
  }
  if (agentTargets.length > 0) {
    sleepBriefMs(300);
    for (const { pid, cmd } of agentTargets) {
      if (!pidAlive(pid)) continue;
      if (logPath) {
        appendLaunchLog(
          logPath,
          `[${new Date().toISOString()}] preempt SIGKILL pid=${pid} (still alive) cmd=${cmd}`,
        );
      }
      if (signalPid(pid, "SIGKILL")) {
        killed.push(`kill:${pid}`);
      }
    }
  }

  // Do not unlink running.cmd here — runner.command owns cleanup after bash exits.
  if (logPath) {
    appendLaunchLog(
      logPath,
      `[${new Date().toISOString()}] preempt signal sent targets=${killed.join(",") || "none"} agents=${agentTargets.map((t) => t.pid).join(",") || "none"}`,
    );
  }
  return {
    preempted: killed.length > 0,
    reason: killed.length > 0 ? killed.join(",") : "signal-attempted",
    killed,
    agentPids: agentTargets.map((t) => t.pid),
  };
}

class LaunchGateError extends Error {
  constructor(message, { code = "LAUNCH_FAILED", retryable = true, detail = null } = {}) {
    super(message);
    this.name = "LaunchGateError";
    this.code = code;
    this.retryable = Boolean(retryable);
    this.detail = detail;
  }
}

function snapshotTextFile(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, content: "" };
  return { exists: true, content: fs.readFileSync(filePath, "utf8") };
}

function restoreTextFile(filePath, snap) {
  if (!snap?.exists) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  fs.writeFileSync(filePath, snap.content, "utf8");
}

function terminalQueueSnapshot(worktreePath) {
  if (!worktreePath || !fs.existsSync(worktreePath)) {
    return {
      busy: false,
      queueDepth: 0,
      runnerHealthy: false,
    };
  }
  const qdir = terminalQueueDir(worktreePath);
  return {
    busy: isTerminalRunnerBusy(qdir),
    queueDepth: countQueuedJobs(qdir),
    runnerHealthy: isTerminalRunnerHealthy(qdir),
  };
}

function terminalJobsDir(queueDir) {
  return path.join(queueDir, "jobs");
}

/** Atomically enqueue a Terminal job (FIFO). Also wakes legacy pending watchers. */
function enqueueTerminalJob(queueDir, commandLine) {
  const jobsDir = terminalJobsDir(queueDir);
  fs.mkdirSync(jobsDir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmp = path.join(jobsDir, `.${id}.tmp`);
  const dest = path.join(jobsDir, `${id}.cmd`);
  const body = `#!/bin/bash
set +e
echo "[duaer] job ${id} start"
${commandLine}
status=$?
echo
echo "[duaer] job ${id} exit=$status"
exit $status
`;
  fs.writeFileSync(tmp, body, { mode: 0o755 });
  fs.renameSync(tmp, dest);
  // Wake + legacy single-slot pending (last wins for old runners)
  try {
    fs.writeFileSync(path.join(queueDir, "wake"), `${id}\n`);
  } catch {
    // ignore
  }
  const pending = path.join(queueDir, "pending.cmd");
  try {
    fs.copyFileSync(dest, pending);
    fs.chmodSync(pending, 0o755);
  } catch {
    // ignore
  }
  return dest;
}

function countQueuedJobs(queueDir) {
  const jobsDir = terminalJobsDir(queueDir);
  if (!fs.existsSync(jobsDir)) return 0;
  try {
    return fs
      .readdirSync(jobsDir)
      .filter((n) => n.endsWith(".cmd") && !n.startsWith(".")).length;
  } catch {
    return 0;
  }
}

function launchInTerminal({
  cwd,
  commandLine,
  logPath,
  reuseKey = null,
  preemptBusy = false,
}) {
  const stamped = `[${new Date().toISOString()}] terminal: ${commandLine}`;
  appendLaunchLog(logPath, stamped);

  const key = reuseKey || cwd;
  if (key && fs.existsSync(key)) {
    const qdir = terminalQueueDir(key);
    fs.mkdirSync(qdir, { recursive: true });

    if (isTerminalRunnerHealthy(qdir)) {
      let busy = isTerminalRunnerBusy(qdir);
      let preempted = false;
      let pre = null;
      // After accept, leftover first-agent must not block revise forever.
      // Preempt *before* enqueue so the new revise Agent is never mistaken
      // for a leftover (false PREEMPT_FAILED while work already started).
      if (busy && preemptBusy) {
        pre = preemptBusyTerminalJob(qdir, {
          worktreePath: cwd,
          logPath,
        });
        preempted = Array.isArray(pre.killed) && pre.killed.length > 0;
        let agentsLeft = cwd ? listWorktreeAgentPids(cwd).length : 0;
        for (let i = 0; i < 10 && agentsLeft > 0; i += 1) {
          sleepBriefMs(200);
          if (i === 4 || i === 8) {
            preemptBusyTerminalJob(qdir, {
              worktreePath: cwd,
              logPath,
            });
          }
          agentsLeft = cwd ? listWorktreeAgentPids(cwd).length : 0;
        }
        if (agentsLeft > 0) {
          throw new LaunchGateError(
            "无法抢占仍在运行的 Agent。请结束该 worktree 的 Terminal 任务后重试续派。",
            {
              code: "PREEMPT_FAILED",
              retryable: true,
              detail: {
                busy: isTerminalRunnerBusy(qdir),
                agentsLeft,
                killed: pre?.killed || [],
                reason: pre?.reason || null,
                enqueued: false,
              },
            },
          );
        }
        // Best-effort: let runner drop running.cmd before we queue revise.
        for (let i = 0; i < 10; i += 1) {
          if (!isTerminalRunnerBusy(qdir)) break;
          sleepBriefMs(150);
        }
      }

      const jobPath = enqueueTerminalJob(qdir, commandLine);
      const queuedCount = countQueuedJobs(qdir);
      busy = isTerminalRunnerBusy(qdir);
      try {
        fs.writeFileSync(
          path.join(qdir, "wake"),
          `${path.basename(jobPath)}\n`,
        );
      } catch {
        // ignore
      }
      const pid = readRunnerPid(qdir);
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] enqueue FIFO job=${path.basename(jobPath)} → runner pid=${pid} busy=${busy} queued=${queuedCount}${preempted ? " preempted=1" : " (wait-for-finish)"}`,
      );
      return {
        pid,
        mode: "terminal-reuse",
        reused: true,
        queued: true,
        busy,
        preempted,
        queueDepth: queuedCount,
        queueDir: qdir,
        jobPath,
      };
    }

    // Stale/dead PID or pre-heartbeat runner: do not claim reuse
    const jobPath = enqueueTerminalJob(qdir, commandLine);
    const queuedCount = countQueuedJobs(qdir);
    const stalePid = readRunnerPid(qdir);
    if (stalePid != null) {
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] runner unhealthy pid=${stalePid} — open fresh Terminal (flock)`,
      );
      clearStaleRunnerPid(qdir);
    }

    // Start a long-lived runner window for this worktree (single-flight via flock)
    if (process.platform === "darwin") {
      const runnerPath = path.join(qdir, "runner.command");
      const body = `#!/bin/bash
QDIR=${shellSingleQuote(qdir)}
cd ${shellSingleQuote(cwd)} || exit 1
mkdir -p "$QDIR/jobs"
touch_hb() { date +%s > "$QDIR/runner.heartbeat" 2>/dev/null || true; }

# Only one runner per worktree (mkdir lock — portable on macOS, no flock)
if ! mkdir "$QDIR/runner.lock.d" 2>/dev/null; then
  echo "[duaer] another Terminal runner already holds the lock — this window exits"
  echo "[duaer] job stays in queue; the existing window will drain it"
  exit 0
fi

echo $$ > "$QDIR/runner.pid"
touch_hb
trap 'rm -f "$QDIR/runner.pid" "$QDIR/running.cmd" "$QDIR/runner.heartbeat" "$QDIR/wake"; rmdir "$QDIR/runner.lock.d" 2>/dev/null' EXIT

next_job() {
  local j
  j=$(ls "$QDIR/jobs"/*.cmd 2>/dev/null | sort | head -1)
  if [ -n "$j" ]; then
    echo "$j"
    return 0
  fi
  if [ -f "$QDIR/pending.cmd" ]; then
    echo "$QDIR/pending.cmd"
    return 0
  fi
  return 1
}

run_one() {
  local job
  job=$(next_job) || return 1
  echo "[duaer] dequeue → $(basename "$job")"
  if ! mv "$job" "$QDIR/running.cmd" 2>/dev/null; then
    echo "[duaer] dequeue race — retry"
    return 0
  fi
  # Drop legacy pending twin if it mirrored this job
  rm -f "$QDIR/pending.cmd" "$QDIR/wake"
  chmod +x "$QDIR/running.cmd" 2>/dev/null
  (
    while [ -f "$QDIR/running.cmd" ]; do
      touch_hb
      sleep 1
    done
  ) &
  local hbp=$!
  bash "$QDIR/running.cmd"
  local status=$?
  kill "$hbp" 2>/dev/null
  wait "$hbp" 2>/dev/null
  rm -f "$QDIR/running.cmd"
  touch_hb
  echo "[duaer] task finished exit=$status — draining queue…"
  return 0
}

clear
echo "[duaer] live Terminal — FIFO 队列（等当前任务跑完自动取下一份）"
echo "[duaer] cwd: $(pwd)"
echo "[duaer] queue: $QDIR/jobs"
echo

# Drain everything already queued, then wait for wake/new jobs
while true; do
  while run_one; do
    :
  done
  echo
  echo "[duaer] 队列空，等待下一轮（现场续派会自动进来）。Ctrl+C 结束。"
  while ! next_job >/dev/null; do
    touch_hb
    # wake file is optional nudge
    if [ -f "$QDIR/wake" ]; then
      rm -f "$QDIR/wake"
      if next_job >/dev/null; then
        break
      fi
    fi
    sleep 1
  done
  echo "[duaer] 收到新任务…"
  echo
done
`;
      fs.writeFileSync(runnerPath, body, { mode: 0o755 });
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] open runner ${runnerPath} job=${path.basename(jobPath)}`,
      );
      const child = spawn("open", [runnerPath], {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", (err) => {
        appendLaunchLog(
          logPath,
          `[${new Date().toISOString()}] open error: ${err.message}`,
        );
      });
      child.unref();
      return {
        pid: child.pid ?? null,
        mode: "terminal",
        commandFile: runnerPath,
        reused: false,
        queued: true,
        busy: false,
        queueDepth: queuedCount,
        queueDir: qdir,
        jobPath,
      };
    }
  }

  if (process.platform === "darwin") {
    const stamp = Date.now();
    const cmdPath = path.join(
      os.tmpdir(),
      `duaer-live-agent-${stamp}.command`,
    );
    const body = `#!/bin/bash
cd ${shellSingleQuote(cwd)} || exit 1
clear
echo "[duaer] running Cursor CLI in Terminal"
echo "[duaer] cwd: $(pwd)"
echo
${commandLine}
status=$?
echo
echo "[duaer] exit=$status — press Enter to close"
read _
`;
    fs.writeFileSync(cmdPath, body, { mode: 0o755 });
    appendLaunchLog(logPath, `[${new Date().toISOString()}] open ${cmdPath}`);

    const child = spawn("open", [cmdPath], {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", (err) => {
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] open error: ${err.message}`,
      );
    });
    child.unref();

    return {
      pid: child.pid ?? null,
      mode: "terminal",
      commandFile: cmdPath,
      reused: false,
    };
  }

  // Linux / other — also non-blocking
  for (const [cmd, args] of [
    ["gnome-terminal", ["--", "bash", "-lc", `cd ${shellSingleQuote(cwd)} && ${commandLine}; exec bash`]],
    ["x-terminal-emulator", ["-e", "bash", "-lc", `cd ${shellSingleQuote(cwd)} && ${commandLine}; exec bash`]],
    ["konsole", ["-e", "bash", "-lc", `cd ${shellSingleQuote(cwd)} && ${commandLine}; exec bash`]],
  ]) {
    if (!whichCmd(cmd)) continue;
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
      cwd,
    });
    child.unref();
    return { pid: child.pid ?? null, mode: "terminal", reused: false };
  }

  const child = spawn("bash", ["-lc", commandLine], {
    detached: true,
    cwd,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  return { pid: child.pid ?? null, mode: "detached", reused: false };
}

function openEditor(cmd, worktreePath, logPath, extraArgs = []) {
  const args = [...extraArgs, worktreePath];
  const child = spawn(cmd, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  appendLaunchLog(
    logPath,
    `[${new Date().toISOString()}] open ${cmd} ${args.join(" ")} pid=${child.pid}`,
  );
  return child.pid ?? null;
}

/**
 * Open the named Duaer worktree with Cursor CLI for watch/operate.
 * Uses `cursor -n` (new window). Optionally focuses Brief tasks.md via -g.
 */
function openCursorWorktree({ worktreePath, featureDir, logPath }) {
  const cursorBin = whichCmd("cursor");
  if (!cursorBin) return { opened: false, pid: null };

  const pid = openEditor("cursor", worktreePath, logPath, ["-n"]);
  const tasksMd = featureDir ? path.join(featureDir, "tasks.md") : null;
  if (tasksMd && fs.existsSync(tasksMd)) {
    // Focus Brief checklist in the window we just opened
    const child = spawn(
      "cursor",
      ["-r", "-g", `${tasksMd}:1`],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    appendLaunchLog(
      logPath,
      `[${new Date().toISOString()}] cursor -r -g ${tasksMd}:1 pid=${child.pid}`,
    );
  }
  return { opened: true, pid };
}

/** Build argv for Cursor Agent CLI in Terminal. Never pass `-w`. No `-p` (interactive TTY). */
function cursorAgentArgv(worktreePath, prompt) {
  return [
    "--workspace",
    worktreePath,
    "--trust",
    "--sandbox",
    "disabled",
    "--force",
    prompt,
  ];
}

function resolveCursorAgentCommand() {
  const agentBin = whichCmd("agent");
  if (agentBin) {
    return { cmd: agentBin, prefix: [], display: "agent" };
  }
  const cursorBin = whichCmd("cursor");
  if (cursorBin) {
    return { cmd: cursorBin, prefix: ["agent"], display: "cursor agent" };
  }
  return null;
}

/** Shell one-liner for Terminal: Cursor CLI with prompt from file. */
function cursorAgentTerminalCommand(worktreePath, promptFile, { continueSession = false } = {}) {
  const resolved = resolveCursorAgentCommand();
  if (!resolved) return null;
  const bin = shellSingleQuote(resolved.cmd);
  const ws = shellSingleQuote(worktreePath);
  const pf = shellSingleQuote(promptFile);
  const sub = resolved.prefix.length ? `${resolved.prefix.join(" ")} ` : "";
  const cont = continueSession ? "--continue " : "";
  return `${bin} ${sub}${cont}--workspace ${ws} --trust --sandbox disabled --force "$(cat ${pf})"`;
}

function spawnBackgroundWorker({ cmd, args, cwd, logPath }) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, "a");
  appendLaunchLog(
    logPath,
    `[${new Date().toISOString()}] exec ${cmd} ${args
      .map((a) => (String(a).length > 80 ? `${String(a).slice(0, 80)}…` : a))
      .join(" ")}`,
  );
  const child = spawn(cmd, args, {
    detached: true,
    cwd,
    stdio: ["ignore", logFd, logFd],
    env: process.env,
  });
  child.on("error", (err) => {
    appendLaunchLog(
      logPath,
      `[${new Date().toISOString()}] spawn error: ${err.message}`,
    );
  });
  child.unref();
  try {
    fs.closeSync(logFd);
  } catch {
    // child holds a dup
  }
  return child.pid ?? null;
}

function rememberPreferredAgent(agentId) {
  const id = String(agentId || "").trim();
  const meta = AGENT_CATALOG.find((a) => a.id === id);
  // Only persist workers — never remember "just open IDE"
  if (meta?.kind === "worker") {
    writeConfig({ preferredAgentId: id });
  }
}

function launchAgent({
  agentId,
  worktreePath,
  agentPrompt,
  logPath,
  featureDir,
  continueSession = false,
  /** When true (revise after accept / recreate): use revise prompt file + preempt leftover busy agent. */
  reviseLaunch = false,
}) {
  const id = String(agentId || "none").trim() || "none";
  // Kick 10-day worker CLI check/upgrade without blocking dispatch
  scheduleWorkerCliRefresh({ force: false });
  const detected = detectAgents();
  const meta = detected.agents.find((a) => a.id === id);
  if (!meta?.available) {
    throw new Error(`本机未检测到启动器：${id}`);
  }

  const launch = {
    agentId: id,
    label: meta.label,
    kind: meta.kind,
    launchedAt: new Date().toISOString(),
    logPath: logPath || null,
    pid: null,
    command: meta.command,
    mode: null,
    openedWorktree: false,
    continueSession: Boolean(continueSession),
    cli: detected.cli || null,
  };

  if (id === "none") {
    throw new Error("只支持 CLI 启动：请选择 Cursor Agent 或 Claude Code");
  }

  if (!worktreePath || !fs.existsSync(worktreePath)) {
    throw new Error("worktree 不存在，无法启动");
  }

  const prompt = String(agentPrompt || "").trim();
  const outLog =
    logPath ||
    path.join(worktreePath, ".duaer", "live-agent-launch.log");
  launch.logPath = outLog;

  if (!prompt) throw new Error("缺少开工 prompt");

  appendLaunchLog(
    outLog,
    `[${launch.launchedAt}] start ${id} continue=${launch.continueSession} revise=${Boolean(reviseLaunch)} cwd=${worktreePath}`,
  );

  // Always write revise prompts to agent-revise-prompt.txt so we never clobber
  // the original launch prompt while the first agent is still reading it.
  const promptFile = path.join(
    path.dirname(outLog),
    reviseLaunch || continueSession
      ? "agent-revise-prompt.txt"
      : "agent-launch-prompt.txt",
  );
  fs.writeFileSync(promptFile, `${prompt}\n`, "utf8");

  const preemptBusy = Boolean(reviseLaunch) && !continueSession;

  if (id === "cursor-agent") {
    const line = cursorAgentTerminalCommand(worktreePath, promptFile, {
      continueSession,
    });
    if (!line) throw new Error("未找到 agent / cursor CLI");
    const term = launchInTerminal({
      cwd: worktreePath,
      commandLine: line,
      logPath: outLog,
      reuseKey: worktreePath,
      preemptBusy,
    });
    launch.pid = term.pid;
    launch.mode = term.mode || "terminal";
    launch.reused = Boolean(term.reused);
    launch.queued = Boolean(term.queued);
    launch.busy = Boolean(term.busy);
    launch.preempted = Boolean(term.preempted);
    launch.openedWorktree = false;
    launch.commandFile = term.commandFile || null;
    const resolved = resolveCursorAgentCommand();
    const queueNote = term.preempted
      ? "preempt+queue"
      : term.busy
        ? "queued wait"
        : term.reused
          ? "Terminal reuse"
          : "Terminal";
    launch.command = `${resolved?.display || "agent"}${continueSession ? " --continue" : ""} --workspace --trust --force (${queueNote})`;
  } else if (id === "claude") {
    if (!whichCmd("claude")) throw new Error("未找到 claude CLI");
    const cont = continueSession ? "--continue " : "";
    // Digital-employee mode: auto-approve tools (like Cursor --force --trust).
    const line = `claude --permission-mode bypassPermissions ${cont}"$(cat ${shellSingleQuote(promptFile)})"`;
    const term = launchInTerminal({
      cwd: worktreePath,
      commandLine: line,
      logPath: outLog,
      reuseKey: worktreePath,
      preemptBusy,
    });
    launch.pid = term.pid;
    launch.mode = term.mode || "terminal";
    launch.reused = Boolean(term.reused);
    launch.queued = Boolean(term.queued);
    launch.busy = Boolean(term.busy);
    launch.preempted = Boolean(term.preempted);
    launch.openedWorktree = false;
    launch.commandFile = term.commandFile || null;
    const queueNote = term.preempted
      ? "preempt+queue"
      : term.busy
        ? "queued wait"
        : term.reused
          ? "Terminal reuse"
          : "Terminal";
    launch.command = `claude --permission-mode bypassPermissions${continueSession ? " --continue" : ""} (${queueNote})`;
  } else {
    throw new Error("只支持 CLI 启动：Cursor Agent 或 Claude Code");
  }

  appendLaunchLog(
    outLog,
    `[${new Date().toISOString()}] spawned mode=${launch.mode} pid=${launch.pid} continue=${launch.continueSession} reused=${Boolean(launch.reused)} preempted=${Boolean(launch.preempted)}`,
  );
  return launch;
}

/** True when Brief text implies the product needs a public/hosted deploy. */
function needsGithubDeploy(text) {
  return /部署|上线|托管|公网|域名|发布站点|发布网站|github\s*pages|gh-pages|\bdeploy\b|\bhosting\b|\bhosted\b|put\s+online|go\s+live|public\s+url|publish\s+(the\s+)?(site|app|page)/i.test(
    String(text || ""),
  );
}

function dispatchToRepo({
  jobId,
  repoPath,
  agentId,
  startCommand,
  deployTarget: deployTargetRaw,
}) {
  const live = readLiveJob(jobId);
  // Stay on the user's chosen folder: bootstrap git + install Duaer there.
  const probe = probeRepo(repoPath, {
    bootstrap: true,
    exact: true,
    ensureDuaer: true,
  });
  const preferred =
    String(live.job.branch || "").trim() || `feat/${slugify(live.id)}`;
  const { branch, worktreeId } = allocateUniqueFeatBranch(preferred, {
    jobId: live.id,
    isTaken: (b, wtId) =>
      hasLocalBranch(probe.path, b) ||
      fs.existsSync(path.join(probe.path, ".worktree", wtId)),
  });
  const worktreePath = path.join(probe.path, ".worktree", worktreeId);

  fs.mkdirSync(path.join(probe.path, ".worktree"), { recursive: true });
  runGit(probe.path, [
    "worktree",
    "add",
    "-b",
    branch,
    worktreePath,
    probe.baseBranch,
  ]);

  // Worktree is a clean checkout — install Duaer inside it (do not hunt elsewhere).
  const worktreeDuaer = ensureDuaerInstalled(worktreePath);

  const specsRoot = path.join(worktreePath, ".duaer", "specs");
  const nextNum = nextSpecNum(specsRoot);
  const slug = live.id.replace(/^\d{3}-/, "") || slugify(branch);
  const specDirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(specsRoot, specDirName);
  fs.mkdirSync(featureDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const goalMatch = live.spec.match(/^# Feature Specification:\s*(.+)$/m);
  const goal = goalMatch ? goalMatch[1].trim() : live.id;
  const goalBody = extractSection(live.spec, "Goal") || goal;
  const acceptBody = extractSection(live.spec, "Acceptance") || "";
  const assumeBody = extractSection(live.spec, "Assumptions") || "- (none)";
  let deployTarget = normalizeDeployTarget(deployTargetRaw);
  if (
    deployTarget === "none" &&
    needsGithubDeploy(
      [live.spec, goalBody, acceptBody, assumeBody].join("\n"),
    )
  ) {
    // Brief implies hosting but desk left「暂不部署」→ default GitHub Pages.
    deployTarget = "github-pages";
  }
  const deployPlan = deployPromptForTarget(deployTarget);
  const deployNeeded = deployPlan.needed || isDeployPlanned(deployTarget);
  const productSpec = `# Feature Specification: ${goal}

**Feature Branch**: \`${branch}\`

**Created**: ${today}

**Status**: Dispatched (Duaer-spec FED)

**Live job**: \`~/.duaer/live/jobs/${live.id}\`

## Goal
${goalBody}

## Out of scope
${extractSection(live.spec, "Out of scope") || "- (none listed)"}

## Acceptance
${acceptBody}

## Assumptions
${assumeBody}

## Notes

Dispatched from Duaer-spec FED into product worktree \`${worktreePath}\`.
${deployPlan.specNote ? `\n${deployPlan.specNote}\n` : ""}
`;

  const productTasks = buildDetailedProductTasksMd({
    goal: goalBody || goal,
    acceptance: acceptBody,
    deployNeeded,
    deployTaskText: deployPlan.deployTaskText,
  });

  fs.writeFileSync(path.join(featureDir, "spec.md"), productSpec, "utf8");
  fs.writeFileSync(path.join(featureDir, "tasks.md"), productTasks, "utf8");
  fs.writeFileSync(
    path.join(worktreePath, ".duaer", "active-job.json"),
    `${JSON.stringify(
      {
        specDir: `.duaer/specs/${specDirName}`,
        branch,
        startedAt: new Date().toISOString(),
        source: "live-dispatch",
        liveJobId: live.id,
        deployTarget,
        deployViaGithubCli: deployTarget === "github-pages",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const deployPrompt = deployPlan.promptBlock;

  const defaultPrompt = `Duaer

按 Duaer 数字员工流程在本 worktree 开工（Duaer-spec FED 已派工）。

工作目录: ${worktreePath}
Brief: ${featureDir}
分支: ${branch}
产品仓: ${probe.path}
计划托管: ${deployTarget}

要求：
0. 本 Brief 已在 Duaer-spec FED 自动验收通过。直接执行；不要进入 Confirming intent；不要让用户从多个风格/方向选项里再选一次；不要反复确认需求
1. 只在上述工作目录开工；Duaer 已安装在本目录（AGENTS.md / .duaer）。不要去其它仓库或全局找 Duaer / duaer-spec 源码仓
2. 只做 Brief 范围；以 Acceptance 为准交付可让人满意的成品（可核对结果，不是过程叙事）
3. 按 .duaer/memory/testing.md（若有）做风险验证
4. 每完成 tasks.md 中的一步，立刻把该行改成 - [x]（Duaer-spec FED 靠此显示细粒度进度）
4b. 拆任务：每个勾选项只覆盖一个可独立验收的功能点；不要把多项验收揉进同一条；不要人为限制条数（不必卡在 12 条内）。若仍偏粗，先按 Acceptance 扩成「一条功能一勾选」（仍用 T00x），保存后再做；小步勾选，不要攒到最后一次勾完
5. 对照 Acceptance 全部满足后，才 stamp ${path.join(featureDir, "delivery.json")} 为 accepted
6. 若有可打开结果（页面/静态文件/本地服务），在 delivery.json 写入 preview.url（相对 worktree 的路径如 index.html，或 http://localhost:…）——满意交付的默认证据是可打开的结果
7. 合入 develop 并 handoff 清理 worktree
8. 文档语言：英文文档不得出现中文；中文文档可夹英文术语
${deployPrompt}`;

  let agentPrompt = String(startCommand || "").trim() || defaultPrompt;
  agentPrompt = agentPrompt.replace(/^Agent\b/m, "Duaer");
  if (!/^Duaer\b/m.test(agentPrompt)) {
    agentPrompt = `Duaer\n\n${agentPrompt}`;
  }
  if (!agentPrompt.includes(worktreePath)) {
    agentPrompt = `${agentPrompt}

——
工作目录: ${worktreePath}
Brief: ${featureDir}
分支: ${branch}
`;
  }

  const detected = detectAgents();
  let chosen = String(agentId || "").trim() || detected.preferredAgentId || "";
  if (!chosen || !detected.agents.some((a) => a.id === chosen)) {
    chosen = detected.agents[0]?.id || "";
  }
  if (!chosen) {
    const hint = (detected.missing || [])
      .map((m) => m.installCommand)
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `未检测到可用 CLI（Cursor Agent / Claude Code）。请先安装：\n${hint || CURSOR_INSTALL_CMD}`,
    );
  }

  const ok = detected.agents.some((a) => a.id === chosen && a.available);
  if (!ok) {
    const miss = detected.missing.find((m) => m.id === chosen);
    throw new Error(
      miss?.installCommand
        ? `未安装 ${miss.label}。请先执行：\n${miss.installCommand}`
        : `未安装启动器：${chosen}`,
    );
  }

  const logPath = path.join(featureDir, "agent-launch.log");
  const launch = launchAgent({
    agentId: chosen,
    worktreePath,
    agentPrompt,
    logPath,
    featureDir,
  });
  rememberPreferredAgent(chosen);

  const dispatch = {
    repoPath: probe.path,
    baseBranch: probe.baseBranch,
    branch,
    worktreePath,
    specDir: `.duaer/specs/${specDirName}`,
    featureDir,
    dispatchedAt: new Date().toISOString(),
    deployTarget,
    openedWith: launch.kind === "open" ? launch.agentId : null,
    launch,
    startCommand: agentPrompt,
    duaerInstall: {
      repo: probe.duaer || { action: "already", path: probe.path },
      worktree: worktreeDuaer,
    },
  };

  const nextJob = {
    ...live.job,
    branch,
    status: "dispatched",
    deployTarget,
    dispatch,
    agentPrompt,
  };
  fs.writeFileSync(live.jobPath, `${JSON.stringify(nextJob, null, 2)}\n`, "utf8");
  rememberRepo(probe.path, { baseBranch: probe.baseBranch });

  return {
    ok: true,
    jobId: live.id,
    ...dispatch,
    deployTarget,
    deployViaGithubCli: deployTarget === "github-pages",
    agentPrompt,
    agents: detectAgents(),
  };
}

function launchDispatchedAgent({ jobId, agentId }) {
  const live = readLiveJob(jobId);
  const dispatch = live.job.dispatch;
  if (!dispatch?.worktreePath) {
    throw new Error("尚未派工，无法启动");
  }
  const agentPrompt =
    live.job.agentPrompt ||
    `按 Duaer 数字员工流程在本 worktree 开工。\n工作目录: ${dispatch.worktreePath}\nBrief: ${dispatch.featureDir}`;
  const logPath = path.join(dispatch.featureDir, "agent-launch.log");
  const launch = launchAgent({
    agentId,
    worktreePath: dispatch.worktreePath,
    agentPrompt,
    logPath,
    featureDir: dispatch.featureDir,
  });
  if (agentId && agentId !== "none") {
    rememberPreferredAgent(agentId);
  }
  const nextDispatch = { ...dispatch, launch, openedWith: launch.kind === "open" ? launch.agentId : dispatch.openedWith };
  const nextJob = {
    ...live.job,
    agentPrompt,
    dispatch: nextDispatch,
  };
  fs.writeFileSync(live.jobPath, `${JSON.stringify(nextJob, null, 2)}\n`, "utf8");
  return {
    ok: true,
    jobId: live.id,
    dispatch: nextDispatch,
    launch,
    agentPrompt,
  };
}

const REVISE_PROMPT = `你是「Duaer-spec FED」改进助手。用户看过成品后提出不满意之处。请把反馈整理成可执行的改进说明。

规则：
1. 提炼 change（改什么）、acceptance（怎么算改好）、keep（不要动什么）
2. 不要写代码。不要假设仓库路径。
3. 只输出一个 JSON，不要 markdown 围栏：
{"change":"...","acceptance":"...","keep":"...","summary":"一句话复述用户意图"}`;

async function restateRevisionFeedback(cfg, feedback, goalHint) {
  try {
    const content = await callChatModel(
      cfg,
      [
        {
          role: "user",
          content: `原目标摘要：${goalHint || "（无）"}\n\n用户反馈：\n${feedback}`,
        },
      ],
      REVISE_PROMPT,
    );
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(content.slice(start, end + 1));
    return {
      change: String(parsed.change || "").trim(),
      acceptance: String(parsed.acceptance || "").trim(),
      keep: String(parsed.keep || "").trim(),
      summary: String(parsed.summary || "").trim(),
    };
  } catch {
    return null;
  }
}

function primaryBriefDir(dispatch) {
  if (!dispatch?.repoPath || !dispatch?.specDir) return null;
  return path.join(dispatch.repoPath, dispatch.specDir);
}

/**
 * After agent handoff the request worktree is removed; Brief + delivery live on
 * the product repo's develop checkout. Prefer worktree when present.
 */
function resolveDispatchRoots(dispatch) {
  const wt = dispatch?.worktreePath ? path.resolve(dispatch.worktreePath) : null;
  const wtOk = Boolean(wt && fs.existsSync(wt));
  const featureOnWt =
    dispatch?.featureDir && fs.existsSync(dispatch.featureDir)
      ? dispatch.featureDir
      : null;
  if (wtOk && featureOnWt) {
    return {
      root: wt,
      featureDir: featureOnWt,
      worktreeExists: true,
      source: "worktree",
    };
  }
  const primary = primaryBriefDir(dispatch);
  if (primary && fs.existsSync(primary)) {
    return {
      root: path.resolve(dispatch.repoPath),
      featureDir: primary,
      worktreeExists: false,
      source: "primary",
    };
  }
  if (wtOk) {
    return {
      root: wt,
      featureDir: dispatch.featureDir,
      worktreeExists: true,
      source: "worktree",
    };
  }
  return {
    root: dispatch?.repoPath ? path.resolve(dispatch.repoPath) : null,
    featureDir: dispatch?.featureDir || null,
    worktreeExists: false,
    source: "missing",
  };
}

/**
 * Recreate a request worktree after handoff so revise can continue.
 * Copies Brief from the product primary checkout when needed.
 */
function recreateWorktreeForRevise(live, dispatch, revN) {
  if (!dispatch?.repoPath) {
    throw new Error("缺少产品仓路径，无法重建 worktree");
  }
  const probe = probeRepo(dispatch.repoPath, {
    bootstrap: false,
    exact: true,
    ensureDuaer: true,
  });
  const base = probe.baseBranch || "develop";
  const rawSlug = String(dispatch.branch || live.id || "revise")
    .replace(/^feat\//, "")
    .replace(/^fix\//, "");
  const slug = slugify(rawSlug).slice(0, 40) || "revise";
  let branch = `feat/${slug}-r${revN}`;
  let worktreeId = branch.replace(/\//g, "-");
  let worktreePath = path.join(probe.path, ".worktree", worktreeId);
  let n = revN;
  while (fs.existsSync(worktreePath) || hasLocalBranch(probe.path, branch)) {
    n += 1;
    branch = `feat/${slug}-r${n}`;
    worktreeId = branch.replace(/\//g, "-");
    worktreePath = path.join(probe.path, ".worktree", worktreeId);
    if (n > revN + 20) {
      throw new Error("无法分配新的续改分支名");
    }
  }

  fs.mkdirSync(path.join(probe.path, ".worktree"), { recursive: true });
  // A full checkout (plus any post-checkout hook) needs more room than plumbing.
  runGit(probe.path, ["worktree", "add", "-b", branch, worktreePath, base], null, {
    timeout: CHILD_BUDGET_MS.gitCheckout,
  });
  ensureDuaerInstalled(worktreePath);

  const primary = primaryBriefDir(dispatch);
  const specDirRel =
    dispatch.specDir ||
    (primary ? path.relative(probe.path, primary) : null);
  if (!specDirRel) {
    throw new Error("缺少 Brief 相对路径（specDir），无法续改");
  }
  const specDirName = path.basename(specDirRel);
  const featureDir = path.join(worktreePath, ".duaer", "specs", specDirName);
  fs.mkdirSync(path.dirname(featureDir), { recursive: true });

  const sourceBrief =
    primary && fs.existsSync(primary)
      ? primary
      : dispatch.featureDir && fs.existsSync(dispatch.featureDir)
        ? dispatch.featureDir
        : null;
  if (!sourceBrief) {
    throw new Error(
      `数字员工已合入 develop 并清理了 worktree；产品仓也找不到 Brief（期望 ${primary || dispatch.featureDir}）。无法续改。`,
    );
  }
  fs.cpSync(sourceBrief, featureDir, { recursive: true });

  fs.writeFileSync(
    path.join(worktreePath, ".duaer", "active-job.json"),
    `${JSON.stringify(
      {
        specDir: `.duaer/specs/${specDirName}`,
        branch,
        startedAt: new Date().toISOString(),
        source: "live-revise-recreate",
        liveJobId: live.id,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    ...dispatch,
    repoPath: probe.path,
    baseBranch: base,
    branch,
    worktreePath,
    featureDir,
    specDir: `.duaer/specs/${specDirName}`,
    recreatedAt: new Date().toISOString(),
    recreatedFrom: sourceBrief,
  };
}

async function reviseDispatchedJob({
  jobId,
  feedback,
  change,
  acceptance,
  keep,
  reason,
  agentId,
  startCommand,
}) {
  const changeLine = String(change || "").trim();
  const acceptLine = String(acceptance || "").trim();
  const keepLine = String(keep || "").trim() || "未点名的能力保持不变";
  const reasonLine = String(reason || "").trim();
  const text = String(feedback || "").trim() || changeLine || reasonLine;
  if (!changeLine && !text) {
    throw new Error("请先在对话里弄清要改什么");
  }
  if (!acceptLine && !text) {
    throw new Error("请先写清怎么算改好了");
  }

  const live = readLiveJob(jobId);
  let dispatch = live.job.dispatch;
  if (!dispatch?.repoPath && !dispatch?.worktreePath) {
    throw new Error("尚未派工，无法继续改进");
  }

  const revN = Number(live.job.revisionCount || 0) + 1;
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  let recreated = false;

  // Handoff may have removed the worktree; recreate from develop + primary Brief
  if (!dispatch.worktreePath || !fs.existsSync(dispatch.worktreePath)) {
    dispatch = recreateWorktreeForRevise(live, dispatch, revN);
    recreated = true;
  } else if (!dispatch.featureDir || !fs.existsSync(dispatch.featureDir)) {
    const primary = primaryBriefDir(dispatch);
    if (primary && fs.existsSync(primary)) {
      dispatch = {
        ...dispatch,
        featureDir: primary,
      };
    } else {
      throw new Error(`Brief 目录不存在：${dispatch.featureDir}`);
    }
  }

  let restated = {
    change: changeLine || text,
    acceptance: acceptLine || "按用户反馈改完后，成品符合反馈描述",
    keep: keepLine,
    summary: reasonLine || text.slice(0, 120),
  };

  // If card incomplete, optional model fill from free text
  if ((!changeLine || !acceptLine) && text) {
    try {
      const cfg = readConfig();
      if (cfg?.apiKey) {
        const goalHint = extractSection(
          fs.readFileSync(path.join(dispatch.featureDir, "spec.md"), "utf8"),
          "Goal",
        );
        const filled = await restateRevisionFeedback(cfg, text, goalHint);
        if (filled) {
          restated = {
            change: changeLine || filled.change || text,
            acceptance: acceptLine || filled.acceptance,
            keep: keepLine || filled.keep || keepLine,
            summary: reasonLine || filled.summary || text.slice(0, 120),
          };
        }
      }
    } catch {
      // keep restated defaults
    }
  }

  const cfgForGate = readConfig();
  if (!configReady(cfgForGate)) {
    throw new Error("请先配置模型后再续派（续派前会自动验收改进卡）");
  }
  const reviseReview = await validateCardOnly(cfgForGate, {
    goal: restated.change,
    outOfScope: restated.keep,
    acceptance: restated.acceptance,
    assumptions: restated.summary,
  });
  if (!reviseReview.passed) {
    throw new ValidateGateError(reviseReview);
  }
  restated = {
    change: reviseReview.goal || restated.change,
    acceptance: reviseReview.acceptance || restated.acceptance,
    keep: reviseReview.outOfScope || restated.keep,
    summary: reviseReview.assumptions || restated.summary,
  };

  const specPath = path.join(dispatch.featureDir, "spec.md");
  const tasksPath = path.join(dispatch.featureDir, "tasks.md");
  const deliveryPath = path.join(dispatch.featureDir, "delivery.json");
  const snapSpec = snapshotTextFile(specPath);
  const snapTasks = snapshotTextFile(tasksPath);
  const snapDelivery = snapshotTextFile(deliveryPath);

  let specMd = snapSpec.exists ? snapSpec.content : "";
  specMd = specMd.replace(/\*\*Status\*\*:\s*.+$/m, `**Status**: Revising (r${revN})`);
  if (!/\*\*Status\*\*:/.test(specMd)) {
    specMd = `${specMd.trim()}\n\n**Status**: Revising (r${revN})\n`;
  }
  const revisionBlock = `

## Revision ${revN}

**Date**: ${today}

**User feedback / reason**:
${reasonLine || text}

**Restated change**: ${restated.change}

**Revision acceptance**: ${restated.acceptance}

**Keep**: ${restated.keep}
`;
  fs.writeFileSync(specPath, `${specMd.trim()}\n${revisionBlock}\n`, "utf8");

  let tasksMd = snapTasks.exists ? snapTasks.content : "# Tasks\n\n";
  const taskBlock = buildDetailedRevisionTasksMd({
    revN,
    change: restated.change,
    acceptance: restated.acceptance,
  });
  fs.writeFileSync(
    tasksPath,
    `${tasksMd.trim()}\n\n## Revision ${revN} tasks\n${taskBlock}\n`,
    "utf8",
  );

  let prevDelivery = null;
  if (snapDelivery.exists) {
    try {
      prevDelivery = JSON.parse(snapDelivery.content);
    } catch {
      prevDelivery = null;
    }
  }
  fs.writeFileSync(
    deliveryPath,
    `${JSON.stringify(
      {
        status: "open",
        revisedAt: now,
        revision: revN,
        previousStatus: prevDelivery?.status || null,
        previousAcceptedAt: prevDelivery?.acceptedAt || null,
        feedback: text,
        restated,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const detected = detectAgents();
  let chosen = String(agentId || "").trim() || detected.preferredAgentId || "";
  if (!chosen || !detected.agents.some((a) => a.id === chosen)) {
    chosen = detected.agents[0]?.id || "";
  }
  if (!chosen) {
    restoreTextFile(specPath, snapSpec);
    restoreTextFile(tasksPath, snapTasks);
    restoreTextFile(deliveryPath, snapDelivery);
    throw new LaunchGateError("未检测到可用 CLI（Cursor Agent / Claude Code）", {
      code: "NO_AGENT",
      retryable: true,
    });
  }
  const ok = detected.agents.some((a) => a.id === chosen && a.available);
  if (!ok) {
    restoreTextFile(specPath, snapSpec);
    restoreTextFile(tasksPath, snapTasks);
    restoreTextFile(deliveryPath, snapDelivery);
    throw new LaunchGateError(`未安装启动器：${chosen}`, {
      code: "AGENT_MISSING",
      retryable: true,
    });
  }

  // After accepted delivery (or recreated worktree), do not use --continue:
  // ended sessions make continue look "enqueued" while the agent never works.
  // Same Terminal queue still applies via launchInTerminal reuse/heartbeat.
  const priorAccepted = prevDelivery?.status === "accepted";
  const continueSession = !recreated && !priorAccepted;

  const defaultPrompt = `Duaer

用户看过成品后不满意，请在同一 worktree 继续改进（Duaer-spec FED Revision ${revN}）。
${
  recreated
    ? "上一轮 worktree 已在 handoff 时清理；已从 develop 重建新 worktree 并带上 Brief。"
    : continueSession
      ? "请续上一次会话上下文（CLI 已带 --continue）。"
      : "请开新一轮会话执行本轮 Revision（不要依赖已结束的 --continue）。"
}

工作目录: ${dispatch.worktreePath}
Brief: ${dispatch.featureDir}
分支: ${dispatch.branch || live.job.branch || ""}

不满意原因：
${restated.summary}

要改什么：
${restated.change}

验收：
${restated.acceptance}

不要动：
${restated.keep}

要求：
0. 本轮 Revision 已在 Duaer-spec FED 自动验收通过。直接改；不要进入 Confirming intent；不要让用户从多个风格/方向选项里再选一次；不要反复确认需求
1. 只做本轮 Revision ${revN} 范围，不要重做无关功能
2. 立刻把 tasks.md 里 R${revN}-* 勾成 - [x]（Duaer-spec FED 靠此显示细粒度进度）
2b. 拆任务：每个 R${revN}-* 只覆盖一个可独立验收的改动；不要把多项验收揉进同一条；不要人为限制条数。若仍偏粗，先按本轮 acceptance 扩成「一条改动一勾选」（仍用 R${revN}-*），保存后再做；小步勾选
3. 对照本轮 Revision acceptance 全部满足后，才 stamp delivery.json 为 accepted，并更新 preview.url（可打开结果是默认证据）
4. 按 testing.md 做风险验证（若有）
5. 不要推远程除非用户明确要求部署/发布
`;

  let agentPrompt = String(startCommand || "").trim() || defaultPrompt;
  agentPrompt = agentPrompt.replace(/^Agent\b/m, "Duaer");
  if (!/^Duaer\b/m.test(agentPrompt)) {
    agentPrompt = `Duaer\n\n${agentPrompt}`;
  }

  const logPath = path.join(dispatch.featureDir, "agent-launch.log");
  appendLaunchLog(
    logPath,
    `\n—— revise r${revN} ${now} (continue=${continueSession} recreated=${recreated} priorAccepted=${priorAccepted}) ——\n${restated.summary}\n`,
  );

  let launch;
  try {
    launch = launchAgent({
      agentId: chosen,
      worktreePath: dispatch.worktreePath,
      agentPrompt,
      logPath,
      featureDir: dispatch.featureDir,
      continueSession,
      // Revise after accept/recreate must not wait forever behind leftover agent.
      reviseLaunch: true,
      // preempt only when !continueSession (priorAccepted || recreated) — see launchAgent
    });
  } catch (err) {
    restoreTextFile(specPath, snapSpec);
    restoreTextFile(tasksPath, snapTasks);
    restoreTextFile(deliveryPath, snapDelivery);
    if (err?.code === "PREEMPT_FAILED" || err?.name === "LaunchGateError") {
      throw err;
    }
    const wrapped = new LaunchGateError(
      err instanceof Error ? err.message : "续派启动失败",
      {
        code: err?.code === "CHILD_TIMEOUT" ? "CHILD_TIMEOUT" : "LAUNCH_FAILED",
        retryable: true,
        detail: { cause: err?.code || err?.name || null },
      },
    );
    throw wrapped;
  }
  rememberPreferredAgent(chosen);

  const nextDispatch = {
    ...dispatch,
    launch,
    revisedAt: now,
    revision: revN,
  };
  const history = Array.isArray(live.job.revisions) ? live.job.revisions : [];
  history.push({
    n: revN,
    at: now,
    feedback: text,
    restated,
  });
  const nextJob = {
    ...live.job,
    status: "revising",
    revisionCount: revN,
    revisions: history,
    agentPrompt,
    dispatch: nextDispatch,
  };
  fs.writeFileSync(live.jobPath, `${JSON.stringify(nextJob, null, 2)}\n`, "utf8");

  return {
    ok: true,
    jobId: live.id,
    revision: revN,
    restated,
    summary: restated.summary,
    continueSession,
    recreated,
    priorAccepted,
    dispatch: nextDispatch,
    launch,
    agentPrompt,
    agents: detectAgents(),
  };
}

function extractSection(md, title) {
  const re = new RegExp(
    `## ${title}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`,
    "i",
  );
  const m = String(md || "").match(re);
  return m ? m[1].trim() : "";
}

function inferRevisionFromTasksMd(tasksMd) {
  let max = 0;
  for (const line of String(tasksMd || "").split(/\r?\n/)) {
    const header = line.match(/^##\s+Revision\s+(\d+)\b/i);
    if (header) max = Math.max(max, Number(header[1]) || 0);
    const item = line.match(/^\s*[-*]\s+\[[ xX]\]\s+R(\d+)(?:[-.\s]|$)/i);
    if (item) max = Math.max(max, Number(item[1]) || 0);
  }
  return max;
}

function tasksMdScope(tasksMd, revision = 0) {
  const raw = String(tasksMd || "");
  const rev = Number(revision) || 0;
  if (rev > 0) {
    const section = raw.match(
      new RegExp(
        `##\\s+Revision\\s+${rev}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s+Revision\\s+\\d+|$)`,
        "i",
      ),
    );
    if (section) return section[1];
    // Fallback: only checkbox lines for this revision id (R1-1 / R1-01 / R1 …)
    return raw
      .split(/\r?\n/)
      .filter((line) =>
        new RegExp(`^\\s*[-*]\\s+\\[[ xX]\\]\\s+R${rev}(?:[-.\\s]|$)`, "i").test(
          line,
        ),
      )
      .join("\n");
  }
  // Dispatch scope: everything before the first Revision section
  const cut = raw.search(/\n##\s+Revision\s+\d+\b/i);
  return cut >= 0 ? raw.slice(0, cut) : raw;
}

function parseTasksProgress(tasksMd, { revision = 0 } = {}) {
  const tasks = [];
  const scope = tasksMdScope(tasksMd, revision);
  const lines = String(scope || "").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const text = m[2].trim();
    const idMatch = text.match(/^(T\d+|R\d+[-\w]*)\b/i);
    tasks.push({
      id: idMatch ? idMatch[1].toUpperCase() : `S${tasks.length + 1}`,
      text,
      done,
    });
  }
  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done) || null;
  let current = "暂无任务清单";
  if (total === 0) {
    current =
      Number(revision) > 0
        ? `Revision ${revision} · 等待任务清单`
        : "暂无任务清单";
  } else if (!next) {
    current =
      Number(revision) > 0
        ? `Revision ${revision} · 任务已全部勾选 · 等待 delivery accepted`
        : "任务已全部勾选 · 等待 delivery accepted";
  } else {
    current = `进行中：${next.text}`;
  }
  return {
    total,
    done: doneCount,
    current,
    tasks,
    revision: Number(revision) || 0,
  };
}

/** When delivery is accepted, never show 0/N · 工单完成 — treat checklist as complete. */
function progressForAcceptedDelivery(progress, { worktreeExists = true } = {}) {
  const base =
    progress && typeof progress === "object"
      ? progress
      : { total: 0, done: 0, current: "", tasks: [] };
  const tasks = Array.isArray(base.tasks)
    ? base.tasks.map((t) => ({ ...t, done: true }))
    : [];
  const total = Number(base.total) || tasks.length;
  return {
    ...base,
    total,
    done: total,
    tasks,
    current: worktreeExists
      ? "delivery accepted · 工单完成"
      : "delivery accepted · 已合入 develop（worktree 已清理）",
  };
}

/** Idempotent: flip remaining `- [ ]` to `- [x]` once delivery is accepted. */
function reconcileTasksMdOnAccept(tasksPath) {
  if (!tasksPath || !fs.existsSync(tasksPath)) return false;
  let raw;
  try {
    raw = fs.readFileSync(tasksPath, "utf8");
  } catch {
    return false;
  }
  if (!/^\s*[-*]\s+\[\s\]\s+/m.test(raw)) return false;
  const next = raw.replace(/^(\s*[-*]\s+)\[\s\](\s+)/gm, "$1[x]$2");
  if (next === raw) return false;
  try {
    fs.writeFileSync(tasksPath, next, "utf8");
    return true;
  } catch {
    return false;
  }
}

function readLogTail(logPath, maxLines = 24) {
  if (!logPath || !fs.existsSync(logPath)) return [];
  try {
    const raw = fs.readFileSync(logPath, "utf8");
    return raw
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .slice(-maxLines);
  } catch {
    return [];
  }
}

/** Recent git changes in the product worktree (for progress column). */
function worktreeActivity(worktreePath, { limit = 10 } = {}) {
  if (!worktreePath || !fs.existsSync(worktreePath)) {
    return { files: [], summary: "" };
  }
  let porcelain = "";
  let diffNames = "";
  try {
    porcelain = runGit(
      worktreePath,
      ["status", "--porcelain", "-uall"],
      null,
      { timeout: 5000 },
    );
  } catch {
    porcelain = "";
  }
  try {
    diffNames = runGit(worktreePath, ["diff", "--name-only", "HEAD"], null, {
      timeout: 5000,
    });
  } catch {
    diffNames = "";
  }
  return parseWorktreeActivityFromGit({ porcelain, diffNames, limit });
}

const PREVIEW_CANDIDATES = [
  "index.html",
  "public/index.html",
  "dist/index.html",
  "build/index.html",
  "docs/index.html",
  "preview.html",
  "demo.html",
];

function resolvePreview({ delivery, worktreePath, jobId }) {
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
  return null;
}

function resultVersionLabel(revision) {
  const rev = Number(revision) || 0;
  return rev > 0 ? `结果 r${rev}` : "结果 · 初版";
}

function resultSnapshotUrl(jobId, revision, rel) {
  const safeJob = encodeURIComponent(jobId);
  const rev = Number(revision) || 0;
  const safeRel = String(rel || "")
    .split("/")
    .filter(Boolean)
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `/api/result/${safeJob}/r${rev}/${safeRel}`;
}

/** Copy preview entry into live job so it survives worktree handoff cleanup. */
function snapshotResultArtifact(live, { revision, rel, srcRoot }) {
  const rev = Number(revision) || 0;
  const cleanRel = String(rel || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  if (!cleanRel || cleanRel.includes("..") || !srcRoot) return null;
  const src = path.resolve(srcRoot, cleanRel);
  const root = path.resolve(srcRoot);
  if (!src.startsWith(root + path.sep) && src !== root) return null;
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return null;
  const destRoot = path.join(live.featureDir, "results", `r${rev}`);
  const dest = path.join(destRoot, cleanRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  const snapshotRel = path
    .join("results", `r${rev}`, cleanRel)
    .split(path.sep)
    .join("/");
  return {
    snapshotRel,
    url: resultSnapshotUrl(live.id, rev, cleanRel),
  };
}

function isResultPreviewable(live, entry, roots) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.kind === "external") {
    return Boolean(entry.url && /^https?:\/\//i.test(String(entry.url)));
  }
  if (entry.snapshotRel) {
    const full = path.join(live.featureDir, entry.snapshotRel);
    return fs.existsSync(full) && fs.statSync(full).isFile();
  }
  if (entry.path && roots?.root) {
    const full = path.join(roots.root, entry.path);
    return fs.existsSync(full) && fs.statSync(full).isFile();
  }
  return false;
}

/**
 * Upsert accepted preview into job.results and prune dead (non-previewable) entries.
 * When worktree is gone, only keep entries that still open (snapshot / external).
 */
function syncJobResults(live, roots, { preview, revision, accepted }) {
  let results = Array.isArray(live.job.results)
    ? live.job.results.map((r) => ({ ...r }))
    : [];
  const rev = Number(revision) || 0;

  if (accepted && preview?.url) {
    const base = {
      revision: rev,
      label: resultVersionLabel(rev),
      kind: preview.kind || "artifact",
      path: preview.path || null,
      source: preview.source || "delivery",
      acceptedAt: new Date().toISOString(),
    };
    if (preview.kind === "external") {
      base.url = preview.url;
    } else if (preview.path && roots?.root) {
      const snap = snapshotResultArtifact(live, {
        revision: rev,
        rel: preview.path,
        srcRoot: roots.root,
      });
      if (snap) {
        base.url = snap.url;
        base.snapshotRel = snap.snapshotRel;
      } else if (roots.worktreeExists || roots.source === "primary") {
        // Still openable from product root; keep live artifact URL.
        base.url = preview.url;
      }
    } else {
      base.url = preview.url;
    }
    // Only keep if we can open it now.
    if (base.url && isResultPreviewable(live, base, roots)) {
      const idx = results.findIndex((r) => Number(r.revision) === rev);
      if (idx >= 0) results[idx] = { ...results[idx], ...base };
      else results.push(base);
    }
  }

  results = results
    .filter((r) => isResultPreviewable(live, r, roots))
    .sort((a, b) => Number(a.revision) - Number(b.revision));

  const prev = JSON.stringify(live.job.results || []);
  const next = JSON.stringify(results);
  if (prev !== next) {
    try {
      const nextJob = { ...live.job, results };
      fs.writeFileSync(
        live.jobPath,
        `${JSON.stringify(nextJob, null, 2)}\n`,
        "utf8",
      );
      live.job = nextJob;
    } catch {
      // ignore persist errors; still return computed list
    }
  }
  return results;
}

function resolveArtifactFile(jobId, relPath) {
  const live = readLiveJob(jobId);
  const dispatch = live.job.dispatch;
  if (!dispatch?.worktreePath && !dispatch?.repoPath) {
    throw new Error("尚未派工");
  }
  const roots = resolveDispatchRoots(dispatch);
  const root = roots.root ? path.resolve(roots.root) : null;
  const rel = String(relPath || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  if (!rel || rel.includes("..")) throw new Error("非法路径");

  if (root && fs.existsSync(root)) {
    const full = path.resolve(root, rel);
    if (
      (full.startsWith(root + path.sep) || full === root) &&
      fs.existsSync(full) &&
      fs.statSync(full).isFile()
    ) {
      return full;
    }
  }

  // Fall back to the newest matching result snapshot (worktree already cleaned).
  const results = Array.isArray(live.job.results) ? live.job.results : [];
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const entry = results[i];
    if (!entry?.snapshotRel) continue;
    const snap = path.join(live.featureDir, entry.snapshotRel);
    if (
      entry.path === rel &&
      fs.existsSync(snap) &&
      fs.statSync(snap).isFile()
    ) {
      return snap;
    }
  }
  throw new Error("产品目录 / worktree 不存在");
}

function resolveResultSnapshotFile(jobId, revision, relPath) {
  const live = readLiveJob(jobId);
  const rev = Number(revision);
  if (!Number.isFinite(rev) || rev < 0) throw new Error("非法版本");
  const rel = String(relPath || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  if (!rel || rel.includes("..")) throw new Error("非法路径");
  const root = path.resolve(live.featureDir, "results", `r${rev}`);
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error("路径越界");
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    throw new Error("结果快照不存在");
  }
  return full;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function dispatchStatus(jobId) {
  const live = readLiveJob(jobId);
  const dispatch = live.job.dispatch || null;
  if (!dispatch?.worktreePath && !dispatch?.repoPath) {
    return {
      jobId: live.id,
      status: live.job.status || "confirmed",
      dispatch: null,
      delivery: null,
      progress: null,
      activity: null,
      logTail: [],
      preview: null,
      results: Array.isArray(live.job.results) ? live.job.results : [],
    };
  }
  const roots = resolveDispatchRoots(dispatch);
  const featureDir = roots.featureDir;
  const deliveryPath = featureDir
    ? path.join(featureDir, "delivery.json")
    : null;
  let delivery = null;
  if (deliveryPath && fs.existsSync(deliveryPath)) {
    try {
      delivery = JSON.parse(fs.readFileSync(deliveryPath, "utf8"));
    } catch {
      delivery = { status: "invalid" };
    }
  }
  const tasksPath = featureDir ? path.join(featureDir, "tasks.md") : null;
  let tasksRaw = "";
  if (tasksPath && fs.existsSync(tasksPath)) {
    try {
      tasksRaw = fs.readFileSync(tasksPath, "utf8");
    } catch {
      tasksRaw = "";
    }
  }
  const logPath =
    dispatch.launch?.logPath ||
    (featureDir ? path.join(featureDir, "agent-launch.log") : null);
  const logTail = logPath ? readLogTail(logPath, 24) : [];
  const worktreeExists = roots.worktreeExists;
  const activity =
    worktreeExists && dispatch.worktreePath
      ? worktreeActivity(dispatch.worktreePath)
      : { files: [], summary: "" };
  const terminal = terminalQueueSnapshot(dispatch.worktreePath);
  const inferredFromTasks = inferRevisionFromTasksMd(tasksRaw);
  const revisionHint = Math.max(
    Number(live.job.revisionCount || 0),
    Number(delivery?.revision || 0),
    inferredFromTasks,
  );
  const revProgressHint =
    revisionHint > 0
      ? parseTasksProgress(tasksRaw, { revision: revisionHint })
      : null;
  const hasOpenRevWork =
    Boolean(revProgressHint) &&
    revProgressHint.total > 0 &&
    revProgressHint.done < revProgressHint.total;
  // First-dispatch delivery is also "open" — only treat as revise when a
  // Revision N already exists (job / delivery / tasks.md), or Terminal is
  // busy on open R{n} work while status still lags on accepted.
  const deliveryAccepted = delivery?.status === "accepted";
  const deliveryOpen = delivery?.status === "open";
  const terminalWorking =
    terminal.busy || Number(terminal.queueDepth || 0) > 0;
  // Mid-revise lag: delivery may still say accepted while job is revising and
  // Terminal is working open R{n} tasks. Once delivery is accepted again and
  // worktree is gone (or Terminal idle / no open R work), never stay "revising".
  const activelyRevising = deliveryAccepted
    ? live.job.status === "revising" &&
      worktreeExists &&
      hasOpenRevWork &&
      terminalWorking
    : live.job.status === "revising" ||
      (revisionHint > 0 && deliveryOpen) ||
      (hasOpenRevWork && terminalWorking);
  const activeRevision =
    revisionHint > 0 &&
    (activelyRevising ||
      Number(live.job.revisionCount || 0) > 0 ||
      Number(delivery?.revision || 0) > 0 ||
      inferredFromTasks > 0)
      ? revisionHint
      : 0;

  let progress = parseTasksProgress(tasksRaw, {
    revision: activeRevision > 0 ? activeRevision : 0,
  });
  const accepted = deliveryAccepted && !activelyRevising;
  if (accepted) {
    if (tasksPath) reconcileTasksMdOnAccept(tasksPath);
    if (tasksPath && fs.existsSync(tasksPath)) {
      try {
        tasksRaw = fs.readFileSync(tasksPath, "utf8");
      } catch {
        // keep
      }
    }
    progress = parseTasksProgress(tasksRaw, {
      revision: activeRevision > 0 ? activeRevision : 0,
    });
    progress = progressForAcceptedDelivery(progress, { worktreeExists });
  } else if (activelyRevising && progress.total === 0 && activeRevision > 0) {
    progress = {
      ...progress,
      current: `Revision ${activeRevision} · 已续派，等待任务勾选…`,
    };
  } else if (!worktreeExists && roots.source === "primary") {
    progress = {
      ...progress,
      current:
        progress.current ||
        "worktree 已清理；结果与 Brief 在产品仓 develop",
    };
  }

  // Keep live job revisionCount in sync when Brief/tasks already show Revision N
  if (
    activeRevision > Number(live.job.revisionCount || 0) ||
    (activelyRevising && live.job.status !== "revising")
  ) {
    try {
      const nextJob = {
        ...live.job,
        revisionCount: Math.max(
          Number(live.job.revisionCount || 0),
          activeRevision,
        ),
        status: activelyRevising
          ? "revising"
          : accepted
            ? "accepted"
            : live.job.status,
      };
      fs.writeFileSync(
        live.jobPath,
        `${JSON.stringify(nextJob, null, 2)}\n`,
        "utf8",
      );
      live.job = nextJob;
    } catch {
      // ignore
    }
  }

  const preview = resolvePreview({
    delivery: delivery || { status: "open" },
    worktreePath: roots.root,
    jobId: live.id,
  });
  // Only after accept (or during a revise round). Not while first dispatch is still in progress.
  const showPreview =
    accepted ||
    activelyRevising ||
    live.job.status === "revising" ||
    Number(live.job.revisionCount || 0) > 0 ||
    activeRevision > 0;

  // Persist accepted status when handoff moved Brief to primary
  if (
    accepted &&
    (live.job.status !== "accepted" ||
      (roots.source === "primary" && live.job.status === "revising"))
  ) {
    try {
      const nextJob = { ...live.job, status: "accepted" };
      fs.writeFileSync(
        live.jobPath,
        `${JSON.stringify(nextJob, null, 2)}\n`,
        "utf8",
      );
      live.job = nextJob;
    } catch {
      // ignore
    }
  }

  const resultRevision = Math.max(
    Number(live.job.revisionCount || 0),
    activeRevision,
    Number(delivery?.revision || 0),
  );
  const results = syncJobResults(live, roots, {
    preview,
    revision: resultRevision,
    accepted,
  });
  // Prefer latest snapshot URL when we recorded one for this revision.
  let previewOut = showPreview ? preview : null;
  if (previewOut && accepted && results.length) {
    const latest = results[results.length - 1];
    if (latest?.url && Number(latest.revision) === resultRevision) {
      previewOut = {
        ...previewOut,
        url: latest.url,
        label: latest.label || previewOut.label,
        kind: latest.kind || previewOut.kind,
      };
    }
  }
  // After worktree cleanup with no previewable snapshot, hide dead current link.
  if (
    previewOut &&
    !worktreeExists &&
    previewOut.kind === "artifact" &&
    !results.some((r) => r.url === previewOut.url)
  ) {
    const fallback = results.length ? results[results.length - 1] : null;
    previewOut = fallback
      ? {
          url: fallback.url,
          label: fallback.label || "查看结果",
          source: fallback.source || "snapshot",
          kind: fallback.kind || "artifact",
          path: fallback.path || null,
        }
      : null;
  }

  const canRevise =
    Boolean(dispatch.repoPath && fs.existsSync(dispatch.repoPath)) &&
    (accepted ||
      activelyRevising ||
      live.job.status === "revising" ||
      Number(live.job.revisionCount || 0) > 0 ||
      activeRevision > 0);

  const statusOut = activelyRevising
    ? "revising"
    : accepted
      ? "accepted"
      : live.job.status;

  return {
    jobId: live.id,
    status: statusOut,
    dispatch: {
      ...dispatch,
      worktreeExists,
      featureDir: featureDir || dispatch.featureDir,
      resolvedFrom: roots.source,
    },
    delivery,
    progress,
    activity,
    logTail,
    preview: previewOut,
    results,
    canRevise,
    revision: resultRevision,
    handoffCleaned: !worktreeExists && roots.source === "primary",
    terminal,
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url || "/", "http://local");

  if (req.method === "GET" && url.pathname === "/api/health") {
    if (!updateInfoCache) {
      await refreshUpdateInfo({ force: false });
    }
    send(res, 200, { ok: true, ...publicConfig() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/presets") {
    send(res, 200, { providers: listProviders() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    send(res, 200, publicConfig());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    try {
      const body = await readJson(req);
      const onlyProjectsRoot =
        body.projectsRoot !== undefined &&
        body.baseUrl === undefined &&
        body.apiKey === undefined &&
        body.model === undefined &&
        body.preferredAgentId === undefined &&
        body.activeProjectPath === undefined;
      const onlyActiveProject =
        body.activeProjectPath !== undefined &&
        body.baseUrl === undefined &&
        body.apiKey === undefined &&
        body.model === undefined &&
        body.preferredAgentId === undefined &&
        body.projectsRoot === undefined;
      let projectsRoot = body.projectsRoot;
      if (projectsRoot !== undefined) {
        const raw = String(projectsRoot || "").trim();
        if (raw) {
          const abs = path.resolve(raw);
          ensureProductDir(abs);
          projectsRoot = abs;
        } else {
          projectsRoot = "";
        }
      }
      let activeProjectPath = body.activeProjectPath;
      if (activeProjectPath !== undefined) {
        const raw = String(activeProjectPath || "").trim();
        activeProjectPath = raw ? path.resolve(raw).replace(/[\\/]+$/, "") : "";
      }
      const next = writeConfig({
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        model: body.model,
        preferredAgentId: body.preferredAgentId,
        projectsRoot,
        activeProjectPath,
      });
      if (onlyProjectsRoot || onlyActiveProject) {
        // Allow saving parent / active project without re-submitting model credentials
        send(res, 200, publicConfig(next));
        return;
      }
      if (!configReady(next)) {
        send(res, 400, {
          error: "需要 baseUrl、apiKey、model 三项",
          ...publicConfig(next),
        });
        return;
      }
      send(res, 200, publicConfig(next));
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "config failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    const cfg = readConfig();
    if (!configReady(cfg)) {
      send(res, 400, {
        error: "请先配置模型（baseUrl / apiKey / model）",
        ...publicConfig(cfg),
      });
      return;
    }
    if (!String(cfg.activeProjectPath || "").trim()) {
      send(res, 400, {
        error: "请先选择或新建项目（右上角「项目」）后再对话",
        code: "NEED_PROJECT",
        ...publicConfig(cfg),
      });
      return;
    }
    try {
      const body = await readJson(req);
      const history = Array.isArray(body.messages) ? body.messages : [];
      const messages = history
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({
          role: m.role,
          content: String(m.content || "").slice(0, 8000),
        }))
        .slice(-20);
      if (!messages.length) {
        send(res, 400, { error: "messages required" });
        return;
      }
      const card = body.card && typeof body.card === "object" ? body.card : {};
      const mode = String(body.mode || "specify").trim();
      const reviseMode = mode === "revise";
      const systemPrompt = reviseMode ? REVISE_CHAT_PROMPT : SYSTEM_PROMPT;
      messages.push({
        role: "user",
        content: reviseMode
          ? `当前改进卡草稿（goal=要改什么，outOfScope=不要动，acceptance=怎么算改好，assumptions=不满意原因）：\n${JSON.stringify(card)}\n请继续对话弄清原因与改动。先写对用户说的话，再 <<<JSON>>> 与卡片 JSON。不要派工。`
          : `当前确认卡草稿：\n${JSON.stringify(card)}\n请继续对话。先写对用户说的话，再 <<<JSON>>> 与卡片 JSON。`,
      });
      const wantStream = body.stream !== false;
      if (wantStream) {
        await streamChatResponse(cfg, messages, res, systemPrompt);
        return;
      }
      const result = await callChatModel(cfg, messages, systemPrompt);
      send(res, 200, parseChatResult(result));
    } catch (err) {
      send(res, 500, {
        error: err instanceof Error ? err.message : "chat failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/validate") {
    const cfg = readConfig();
    if (!configReady(cfg)) {
      send(res, 400, {
        error: "请先配置模型后再校验",
        ...publicConfig(cfg),
      });
      return;
    }
    try {
      const body = await readJson(req);
      const card = {
        goal: String(body.goal || body.change || "").trim(),
        outOfScope: String(body.outOfScope || body.keep || "").trim(),
        acceptance: String(body.acceptance || "").trim(),
        assumptions: String(body.assumptions || body.reason || "").trim(),
      };
      const review = await validateCardOnly(cfg, card);
      send(res, review.passed ? 200 : 422, {
        ok: review.passed,
        passed: review.passed,
        summary: review.summary,
        issues: review.issues,
        card: {
          goal: review.goal,
          outOfScope: review.outOfScope,
          acceptance: review.acceptance,
          assumptions: review.assumptions,
        },
        error: review.passed ? undefined : review.summary || "自动验收未通过",
      });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "validate failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/validate/fix") {
    const cfg = readConfig();
    if (!configReady(cfg)) {
      send(res, 400, {
        error: "请先配置模型后再自动修正",
        ...publicConfig(cfg),
      });
      return;
    }
    try {
      const body = await readJson(req);
      const card = {
        goal: String(body.goal || body.change || "").trim(),
        outOfScope: String(body.outOfScope || body.keep || "").trim(),
        acceptance: String(body.acceptance || "").trim(),
        assumptions: String(body.assumptions || body.reason || "").trim(),
      };
      const issues = Array.isArray(body.issues) ? body.issues : [];
      const fixed = await autoFixConfirmCard(cfg, card, issues);
      const review = await validateCardOnly(cfg, fixed);
      send(res, review.passed ? 200 : 422, {
        ok: review.passed,
        passed: review.passed,
        fixSummary: fixed.summary,
        summary: review.summary,
        issues: review.issues,
        card: {
          goal: review.goal,
          outOfScope: review.outOfScope,
          acceptance: review.acceptance,
          assumptions: review.assumptions,
        },
        error: review.passed ? undefined : review.summary || "自动验收未通过",
      });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "validate fix failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/confirm") {
    const cfg = readConfig();
    if (!configReady(cfg)) {
      send(res, 400, {
        error: "请先配置模型后再确认（确认时会自动验收需求）",
        ...publicConfig(cfg),
      });
      return;
    }
    try {
      const body = await readJson(req);
      const card = {
        goal: String(body.goal || "").trim(),
        outOfScope: String(body.outOfScope || "").trim(),
        acceptance: String(body.acceptance || "").trim(),
        assumptions: String(body.assumptions || "").trim(),
      };
      if (!card.goal || !card.acceptance) {
        send(res, 400, { error: "goal and acceptance are required" });
        return;
      }
      const review = await autoAcceptCard(cfg, card);
      if (!review.passed) {
        send(res, 422, {
          ok: false,
          passed: false,
          error: review.summary || "自动验收未通过",
          summary: review.summary,
          issues: review.issues,
          card: {
            goal: review.goal,
            outOfScope: review.outOfScope,
            acceptance: review.acceptance,
            assumptions: review.assumptions,
          },
        });
        return;
      }
      const result = writeBrief({
        goal: review.goal,
        outOfScope: review.outOfScope,
        acceptance: review.acceptance,
        assumptions: review.assumptions,
        rawAsk: body.rawAsk,
        projectPath:
          body.projectPath || body.repoPath || readConfig().activeProjectPath,
        review: { summary: review.summary || "自动验收通过" },
      });
      send(res, 200, {
        ...result,
        passed: true,
        needDispatch: true,
        card: {
          goal: review.goal,
          outOfScope: review.outOfScope,
          acceptance: review.acceptance,
          assumptions: review.assumptions,
        },
      });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "confirm failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/confirm/fix") {
    const cfg = readConfig();
    if (!configReady(cfg)) {
      send(res, 400, {
        error: "请先配置模型后再自动修正",
        ...publicConfig(cfg),
      });
      return;
    }
    try {
      const body = await readJson(req);
      const card = {
        goal: String(body.goal || "").trim(),
        outOfScope: String(body.outOfScope || "").trim(),
        acceptance: String(body.acceptance || "").trim(),
        assumptions: String(body.assumptions || "").trim(),
      };
      const issues = Array.isArray(body.issues) ? body.issues : [];
      if (!card.goal && !card.acceptance) {
        send(res, 400, { error: "确认卡为空，无法修正" });
        return;
      }
      const fixed = await autoFixConfirmCard(cfg, card, issues);
      const review = await autoAcceptCard(cfg, fixed);
      if (!review.passed) {
        send(res, 422, {
          ok: false,
          passed: false,
          fixed: true,
          error: review.summary || "自动修正后仍未通过验收",
          summary: review.summary,
          fixSummary: fixed.summary,
          issues: review.issues,
          card: {
            goal: review.goal,
            outOfScope: review.outOfScope,
            acceptance: review.acceptance,
            assumptions: review.assumptions,
          },
        });
        return;
      }
      const result = writeBrief({
        goal: review.goal,
        outOfScope: review.outOfScope,
        acceptance: review.acceptance,
        assumptions: review.assumptions,
        rawAsk: body.rawAsk,
        review: {
          summary: `${fixed.summary || "已自动修正"}；${review.summary || "验收通过"}`,
        },
      });
      send(res, 200, {
        ...result,
        passed: true,
        fixed: true,
        needDispatch: true,
        fixSummary: fixed.summary,
        card: {
          goal: review.goal,
          outOfScope: review.outOfScope,
          acceptance: review.acceptance,
          assumptions: review.assumptions,
        },
      });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "fix failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/repos") {
    const discover = url.searchParams.get("discover") === "1";
    if (discover) {
      send(res, 200, listReposForUi());
    } else {
      send(res, 200, { recent: readRepos(), discovered: [] });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/repos/pick") {
    let chosen = null;
    try {
      chosen = pickFolderNative();
      const probe = probeRepo(chosen, {
        bootstrap: true,
        exact: true,
        ensureDuaer: true,
      });
      const recent = rememberRepo(probe.path, {
        baseBranch: probe.baseBranch,
      });
      send(res, 200, {
        ok: true,
        ...probe,
        recent,
        discovered: [],
      });
    } catch (err) {
      const code = err && err.code;
      send(res, 400, {
        error: err instanceof Error ? err.message : "pick failed",
        cancelled: code === "CANCELLED",
        path: (err && err.path) || chosen || undefined,
        candidates: err && err.candidates ? err.candidates : undefined,
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/repos/add") {
    try {
      const body = await readJson(req);
      const probe = probeRepo(body.path, {
        bootstrap: true,
        exact: true,
        ensureDuaer: true,
      });
      rememberRepo(probe.path, { baseBranch: probe.baseBranch });
      send(res, 200, { ok: true, ...probe, repos: readRepos() });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "add failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/repos/probe") {
    try {
      const body = await readJson(req);
      const probe = probeRepo(body.path, {
        bootstrap: body.bootstrap !== false,
        exact: body.exact !== false,
        ensureDuaer: body.ensureDuaer === true,
      });
      send(res, 200, { ok: true, ...probe });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "probe failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/agents") {
    send(res, 200, detectAgents());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/dispatch") {
    try {
      const body = await readJson(req);
      const result = dispatchToRepo({
        jobId: body.jobId,
        repoPath: body.repoPath,
        agentId: body.agentId,
        startCommand: body.startCommand,
        deployTarget: body.deployTarget,
      });
      send(res, 200, result);
    } catch (err) {
      send(res, err?.code === "CHILD_TIMEOUT" ? 504 : 400, {
        error: err instanceof Error ? err.message : "dispatch failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/dispatch/launch") {
    try {
      const body = await readJson(req);
      const result = launchDispatchedAgent({
        jobId: body.jobId,
        agentId: body.agentId,
      });
      send(res, 200, result);
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "launch failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/revise") {
    try {
      const body = await readJson(req);
      const result = await reviseDispatchedJob({
        jobId: body.jobId,
        feedback: body.feedback,
        change: body.change || body.goal,
        acceptance: body.acceptance,
        keep: body.keep || body.outOfScope,
        reason: body.reason || body.assumptions,
        agentId: body.agentId,
        startCommand: body.startCommand,
      });
      send(res, 200, result);
    } catch (err) {
      if (err?.code === "VALIDATE_GATE") {
        const review = err.review || {};
        send(res, 422, {
          ok: false,
          passed: false,
          code: "VALIDATE_GATE",
          retryable: true,
          error: err.message,
          summary: review.summary || err.message,
          issues: review.issues || [],
          card: {
            goal: review.goal,
            outOfScope: review.outOfScope,
            acceptance: review.acceptance,
            assumptions: review.assumptions,
          },
        });
        return;
      }
      const code =
        err?.code === "PREEMPT_FAILED"
          ? "PREEMPT_FAILED"
          : err?.code === "CHILD_TIMEOUT"
            ? "CHILD_TIMEOUT"
            : err?.code === "NO_AGENT" || err?.code === "AGENT_MISSING"
              ? err.code
              : err?.name === "LaunchGateError"
                ? err.code || "LAUNCH_FAILED"
                : err?.code || "REVISE_FAILED";
      const status =
        code === "CHILD_TIMEOUT"
          ? 504
          : code === "PREEMPT_FAILED"
            ? 409
            : 400;
      send(res, status, {
        ok: false,
        code,
        retryable: err?.retryable !== false,
        error: err instanceof Error ? err.message : "revise failed",
        detail: err?.detail || undefined,
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/jobs") {
    try {
      const limit = Number(url.searchParams.get("limit") || 40);
      send(res, 200, { jobs: listLiveJobs({ limit }) });
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "jobs list failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    try {
      send(res, 200, listProjectsPayload());
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "projects list failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/projects/activate") {
    try {
      const body = await readJson(req);
      send(res, 200, activateProject(body));
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "activate project failed",
        code: err?.code || undefined,
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    try {
      const jobId = decodeURIComponent(
        url.pathname.slice("/api/jobs/".length).split("/")[0] || "",
      );
      send(res, 200, liveJobDetail(jobId));
    } catch (err) {
      send(res, 404, {
        error: err instanceof Error ? err.message : "job not found",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    try {
      const jobId = url.searchParams.get("jobId");
      send(res, 200, dispatchStatus(jobId));
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "status failed",
      });
    }
    return;
  }

  // /api/artifact/<jobId>/relative/path — keeps relative CSS/JS working in HTML
  if (req.method === "GET" && url.pathname.startsWith("/api/artifact/")) {
    try {
      const parts = url.pathname.slice("/api/artifact/".length).split("/");
      const jobId = decodeURIComponent(parts.shift() || "");
      const rel = parts.map((p) => decodeURIComponent(p)).join("/");
      const filePath = resolveArtifactFile(jobId, rel || "index.html");
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        "content-type": contentTypeFor(filePath),
        "cache-control": "no-store",
      });
      res.end(body);
    } catch (err) {
      send(res, 404, {
        error: err instanceof Error ? err.message : "artifact not found",
      });
    }
    return;
  }

  // /api/result/<jobId>/r<n>/relative/path — accepted-version snapshots
  if (req.method === "GET" && url.pathname.startsWith("/api/result/")) {
    try {
      const parts = url.pathname.slice("/api/result/".length).split("/");
      const jobId = decodeURIComponent(parts.shift() || "");
      const revToken = decodeURIComponent(parts.shift() || "");
      const revMatch = /^r(\d+)$/i.exec(revToken);
      if (!revMatch) throw new Error("非法版本");
      const rel = parts.map((p) => decodeURIComponent(p)).join("/");
      const filePath = resolveResultSnapshotFile(
        jobId,
        Number(revMatch[1]),
        rel || "index.html",
      );
      const body = fs.readFileSync(filePath);
      res.writeHead(200, {
        "content-type": contentTypeFor(filePath),
        "cache-control": "no-store",
      });
      res.end(body);
    } catch (err) {
      send(res, 404, {
        error: err instanceof Error ? err.message : "result not found",
      });
    }
    return;
  }

  send(res, 404, { error: "not found" });
}

function cmdConfig(opts) {
  const partial = {};
  if (opts.provider) {
    const preset = resolveProvider(opts.provider);
    if (!preset || preset.id === "custom") {
      if (opts.provider && String(opts.provider).toLowerCase() !== "custom") {
        console.error(
          `未知服务商: ${opts.provider}（可用: deepseek, openai, custom）`,
        );
        process.exit(1);
      }
    } else {
      if (opts.baseUrl == null) partial.baseUrl = preset.baseUrl;
      if (opts.model == null) partial.model = preset.model;
    }
  }
  if (opts.baseUrl != null) partial.baseUrl = opts.baseUrl;
  if (opts.apiKey != null) partial.apiKey = opts.apiKey;
  if (opts.model != null) partial.model = opts.model;
  if (!Object.keys(partial).length) {
    const pub = publicConfig();
    console.log(JSON.stringify(pub, null, 2));
    if (!pub.ready) {
      console.log(`
未就绪。请配置模型，例如：

  duaer live config --provider deepseek --api-key sk-...
  duaer live config --base-url https://api.deepseek.com --api-key sk-... --model deepseek-flash
  duaer live config --provider openai --api-key sk-...

或环境变量 DUAER_LIVE_BASE_URL / DUAER_LIVE_API_KEY / DUAER_LIVE_MODEL
配置写在 ${configPath()}（与用户业务仓库隔离）
`);
      process.exit(1);
    }
    return;
  }
  const next = writeConfig(partial);
  console.log("已写入", configPath());
  console.log(JSON.stringify(publicConfig(next), null, 2));
  if (!configReady(next)) {
    console.error("仍缺字段：需要 baseUrl、apiKey、model");
    process.exit(1);
  }
}

function serve(port) {
  if (!fs.existsSync(WEB_ROOT)) {
    console.error("Missing web/live-dev");
    process.exit(1);
  }
  ensureLiveDirs();
  const server = http.createServer((req, res) => {
    if ((req.url || "").startsWith("/api/")) {
      void handleApi(req, res);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }
    send(res, 405, { error: "method not allowed" });
  });

  server.listen(port, "127.0.0.1", () => {
    const cfg = publicConfig();
    console.log(`Duaer-spec FED  http://127.0.0.1:${port}`);
    console.log(`隔离目录  ${liveRoot()}`);
    console.log(`Brief 写入 ${jobsRoot()}  （不会写入你当前业务仓库）`);
    if (!cfg.ready) {
      console.log(`
模型未配置。请先：
  duaer live config --provider deepseek --api-key <key>
  或页面里点「DeepSeek」再填 Key。
`);
    } else {
      console.log(`模型      ${cfg.model} @ ${cfg.baseUrl}`);
    }
    scheduleUpdateHint();
    void refreshUpdateInfo({ force: false });
    // Background: every 10 days check/upgrade Cursor Agent / Claude Code CLIs
    setTimeout(() => {
      console.log("Worker CLI 10d check: scheduled (background)");
      scheduleWorkerCliRefresh({ force: false });
    }, 2500);
  });
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  if (opts.cmd === "config") {
    cmdConfig(opts);
    return;
  }
  if (opts.cmd === "repo-add") {
    try {
      cmdRepoAdd(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
    return;
  }
  serve(opts.port);
}

main();
