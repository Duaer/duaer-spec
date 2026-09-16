/**
 * 现场开发 — isolated desk (not the user's product repo).
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(PACKAGE_ROOT, "web", "live-dev");

/** Extra dirs for CLI discovery (launchd PATH is often /usr/bin:/bin only). */
const CLI_PATH_DIRS = [
  path.join(os.homedir(), ".local", "bin"),
  "/usr/local/bin",
  "/opt/homebrew/bin",
];

function ensureCliSearchPath() {
  const cur = String(process.env.PATH || "");
  const parts = cur.split(path.delimiter).filter(Boolean);
  const prepend = CLI_PATH_DIRS.filter(
    (d) => fs.existsSync(d) && !parts.includes(d),
  );
  if (prepend.length) {
    process.env.PATH = [...prepend, ...parts].join(path.delimiter);
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
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      baseUrl: String(raw.baseUrl || process.env.DUAER_LIVE_BASE_URL || "").trim(),
      apiKey: String(raw.apiKey || process.env.DUAER_LIVE_API_KEY || "").trim(),
      model: String(raw.model || process.env.DUAER_LIVE_MODEL || "").trim(),
      preferredAgentId: String(raw.preferredAgentId || "").trim(),
    };
  } catch {
    return { baseUrl: "", apiKey: "", model: "", preferredAgentId: "" };
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
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
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

const SYSTEM_PROMPT = `你是「现场开发」需求助手。通过多轮对话把用户随口说的话整理成精确需求。

规则：
1. 每次只问 1 个最关键的卡点问题（可给 2～4 个选项建议）。
2. 维护四块：goal（要做什么）、outOfScope（不做什么）、acceptance（验收标准）、assumptions（假设）。
3. 四块够清楚、验收可检查时，ready=true。
4. 不要写代码。不要假设用户仓库路径。
5. 输出格式（严格）：
   - 先写对用户说的纯文本（可多行，不要 JSON）
   - 然后单独一行：<<<JSON>>>
   - 再输出一个 JSON 对象（不要 markdown 围栏）：
{"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"...","ready":false,"options":["可选A","可选B"]}`;

const CHAT_JSON_MARKER = "<<<JSON>>>";

const REVISE_CHAT_PROMPT = `你是「现场开发」改进对话助手。用户已看过成品但不满意。通过多轮对话弄清：为什么不满意、要改成什么样、什么不要动。

规则：
1. 每次只问 1 个最关键问题（可给 2～4 个选项）。先问原因/痛点，再问期望改动。
2. 维护四块（仍用确认卡字段名，便于前端复用）：
   - goal = 本轮要改什么（具体可执行）
   - outOfScope = 本轮不要动什么
   - acceptance = 怎么算改好了（可检查）
   - assumptions = 用户不满意的原因 / 背景摘要
3. 四块够清楚且可执行时 ready=true。
4. 不要写代码。不要立刻派工。不要假设仓库路径。
5. 输出格式（严格）：
   - 先写对用户说的纯文本
   - 然后单独一行：<<<JSON>>>
   - 再输出 JSON（不要 markdown 围栏）：
{"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"...","ready":false,"options":["可选A","可选B"]}`;

const ACCEPT_PROMPT = `你是「现场开发」需求验收官。用户即将锁定确认卡并开工。请自动验收这份需求。

检查：
1. goal 是否单一、可执行
2. acceptance 是否可客观检查（避免「更好用」这类空话）
3. outOfScope 是否划清边界（可简短）
4. assumptions 是否合理、不偷换目标

规则：
- 若小改即可通过：修订四块，passed=true
- 若缺关键信息：passed=false，issues 列出缺什么（中文，短句）
- 不要写代码。不要假设仓库路径。
- 只输出一个 JSON，不要 markdown 围栏：
{"passed":false,"summary":"一句话结论","issues":["问题1"],"goal":"...","outOfScope":"...","acceptance":"...","assumptions":"..."}`;

const FIX_ACCEPT_PROMPT = `你是「现场开发」需求修正助手。自动验收未通过，请根据 issues 修订确认卡四块，尽量补全可检查的验收标准，不要编造用户没提过的大功能。

规则：
1. 针对每条 issue 修改 goal / outOfScope / acceptance / assumptions
2. 保持用户原意；缺信息时写合理、可检查的默认假设，并写进 assumptions
3. 不要写代码。不要假设仓库路径。
4. 只输出一个 JSON，不要 markdown 围栏：
{"summary":"一句话说明改了什么","goal":"...","outOfScope":"...","acceptance":"...","assumptions":"..."}`;

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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
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
    const { done, value } = await reader.read();
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
    options: Array.isArray(obj.options)
      ? obj.options.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
      : [],
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

function localAcceptCheck(card) {
  const issues = [];
  const goal = String(card.goal || "").trim();
  const acceptance = String(card.acceptance || "").trim();
  if (goal.length < 4) issues.push("「要做什么」过短，写不清目标");
  if (acceptance.length < 4) {
    issues.push("「验收标准」过短，无法检查是否完成");
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
  if (!goal || !acceptance) throw new Error("goal and acceptance are required");

  const { root, nextNum } = nextJobDir();
  const slug = slugify(goal);
  const dirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(root, dirName);
  fs.mkdirSync(featureDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const branchHint = `feat/${slug}`;
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

**Status**: Confirmed (现场开发)

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

Confirmed via 现场开发 after auto-accept. Next: dispatch into a product repo worktree from the live desk.
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

  const agentPrompt = `现场开发已确认需求（隔离区 Brief）。下一步在页面选择产品仓库派工，或手动：

Brief: ${featureDir}
分支建议: ${branchHint}
`;

  return {
    ok: true,
    jobId: dirName,
    featureDir,
    relativeDir: `~/.duaer/live/jobs/${dirName}`,
    branch: branchHint,
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
  const next = [
    {
      path: abs,
      name: path.basename(abs) || abs,
      lastUsedAt: new Date().toISOString(),
      ...extra,
    },
    ...readRepos().filter((r) => normalizeRepoPath(r.path) !== abs),
  ].slice(0, 20);
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
  console.log("现场开发派工时可直接点选。");
}

function runGit(cwd, args, envExtra = null) {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    env: envExtra ? { ...process.env, ...envExtra } : process.env,
  });
  if (r.status !== 0) {
    throw new Error(
      String(r.stderr || r.stdout || `git ${args.join(" ")} failed`).trim(),
    );
  }
  return String(r.stdout || "").trim();
}

function hasLocalBranch(cwd, name) {
  const r = spawnSync(
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${name}`],
    { cwd },
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
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dir,
    encoding: "utf8",
  });
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
    spawnSync("git", ["rev-parse", "-q", "--verify", "HEAD"], {
      cwd: top,
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
  let bootstrapped = false;
  let top;
  try {
    top = resolveGitTop(repoPath, { exact });
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
  const r = spawnSync(process.execPath, [script, "init", "--here"], {
    cwd: abs,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
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

function whichCmd(cmd) {
  const name = String(cmd || "").trim();
  if (!name || name.includes("/") || name.includes("\\")) return null;
  const r = spawnSync("which", [name], {
    encoding: "utf8",
    env: process.env,
  });
  if (r.status === 0) {
    const p = String(r.stdout || "")
      .trim()
      .split("\n")[0];
    if (p) return p;
  }
  // Fallback when `which` is missing or PATH still incomplete (e.g. launchd)
  for (const dir of CLI_PATH_DIRS) {
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
const CURSOR_INSTALL_CMD = "curl https://cursor.com/install -fsS | bash";

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
      "查看 https://docs.anthropic.com/en/docs/claude-code/overview 安装 Claude Code CLI",
  },
];

function cursorCliVersion() {
  const bin = whichCmd("agent") || whichCmd("cursor");
  if (!bin) return null;
  const r = spawnSync(bin, whichCmd("agent") ? ["--version"] : ["agent", "--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  if (r.status !== 0) return null;
  return String(r.stdout || r.stderr || "")
    .trim()
    .split("\n")[0]
    .slice(0, 120);
}

function detectAgents() {
  const preferredRaw = readConfig().preferredAgentId || "";
  const preferredMeta = AGENT_CATALOG.find((a) => a.id === preferredRaw);
  const preferred = preferredMeta ? preferredRaw : "";
  const agentBin = whichCmd("agent");
  const cursorBin = whichCmd("cursor");
  const claudeBin = whichCmd("claude");
  const version = cursorCliVersion();

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
}

function isTerminalRunnerBusy(queueDir) {
  return fs.existsSync(path.join(queueDir, "running.cmd"));
}

function writePendingCmd(queueDir, commandLine) {
  const pending = path.join(queueDir, "pending.cmd");
  fs.writeFileSync(
    pending,
    `#!/bin/bash
set +e
${commandLine}
status=$?
echo
echo "[duaer] task exit=$status"
exit $status
`,
    { mode: 0o755 },
  );
  return pending;
}

function launchInTerminal({ cwd, commandLine, logPath, reuseKey = null }) {
  const stamped = `[${new Date().toISOString()}] terminal: ${commandLine}`;
  appendLaunchLog(logPath, stamped);

  const key = reuseKey || cwd;
  if (key && fs.existsSync(key)) {
    const qdir = terminalQueueDir(key);
    fs.mkdirSync(qdir, { recursive: true });
    writePendingCmd(qdir, commandLine);

    if (isTerminalRunnerHealthy(qdir)) {
      const pid = readRunnerPid(qdir);
      const busy = isTerminalRunnerBusy(qdir);
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] enqueue → existing Terminal runner pid=${pid} busy=${busy} (wait-for-finish)`,
      );
      return {
        pid,
        mode: "terminal-reuse",
        reused: true,
        queued: true,
        busy,
        queueDir: qdir,
      };
    }

    // Stale/dead PID or pre-heartbeat runner: do not claim reuse
    const stalePid = readRunnerPid(qdir);
    if (stalePid != null) {
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] runner unhealthy pid=${stalePid} — open fresh Terminal`,
      );
      clearStaleRunnerPid(qdir);
    }

    // Start a long-lived runner window for this worktree
    if (process.platform === "darwin") {
      const runnerPath = path.join(qdir, "runner.command");
      const body = `#!/bin/bash
QDIR=${shellSingleQuote(qdir)}
cd ${shellSingleQuote(cwd)} || exit 1
touch_hb() { date +%s > "$QDIR/runner.heartbeat" 2>/dev/null || true; }
echo $$ > "$QDIR/runner.pid"
touch_hb
trap 'rm -f "$QDIR/runner.pid" "$QDIR/running.cmd" "$QDIR/runner.heartbeat"' EXIT
run_pending() {
  if [ ! -f "$QDIR/pending.cmd" ]; then
    return 0
  fi
  mv "$QDIR/pending.cmd" "$QDIR/running.cmd"
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
  return $status
}
clear
echo "[duaer] live Terminal — 同一窗口承接派工与续派（队列：等当前任务跑完再取下一份）"
echo "[duaer] cwd: $(pwd)"
echo
run_pending
while true; do
  echo
  echo "[duaer] 等待下一轮任务（现场点「再派一版」会送到这里）。Ctrl+C 结束。"
  while [ ! -f "$QDIR/pending.cmd" ]; do
    touch_hb
    sleep 1
  done
  echo "[duaer] 收到新任务…"
  echo
  run_pending
done
`;
      fs.writeFileSync(runnerPath, body, { mode: 0o755 });
      appendLaunchLog(
        logPath,
        `[${new Date().toISOString()}] open runner ${runnerPath}`,
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
        queueDir: qdir,
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
}) {
  const id = String(agentId || "none").trim() || "none";
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
    `[${launch.launchedAt}] start ${id} continue=${launch.continueSession} cwd=${worktreePath}`,
  );

  const promptFile = path.join(
    path.dirname(outLog),
    continueSession ? "agent-revise-prompt.txt" : "agent-launch-prompt.txt",
  );
  fs.writeFileSync(promptFile, `${prompt}\n`, "utf8");

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
    });
    launch.pid = term.pid;
    launch.mode = term.mode || "terminal";
    launch.reused = Boolean(term.reused);
    launch.queued = Boolean(term.queued);
    launch.busy = Boolean(term.busy);
    launch.openedWorktree = false;
    launch.commandFile = term.commandFile || null;
    const resolved = resolveCursorAgentCommand();
    const queueNote = term.busy
      ? "queued wait"
      : term.reused
        ? "Terminal reuse"
        : "Terminal";
    launch.command = `${resolved?.display || "agent"}${continueSession ? " --continue" : ""} --workspace --trust --force (${queueNote})`;
  } else if (id === "claude") {
    if (!whichCmd("claude")) throw new Error("未找到 claude CLI");
    const cont = continueSession ? "--continue " : "";
    const line = `claude ${cont}"$(cat ${shellSingleQuote(promptFile)})"`;
    const term = launchInTerminal({
      cwd: worktreePath,
      commandLine: line,
      logPath: outLog,
      reuseKey: worktreePath,
    });
    launch.pid = term.pid;
    launch.mode = term.mode || "terminal";
    launch.reused = Boolean(term.reused);
    launch.queued = Boolean(term.queued);
    launch.busy = Boolean(term.busy);
    launch.openedWorktree = false;
    launch.commandFile = term.commandFile || null;
    const queueNote = term.busy
      ? "queued wait"
      : term.reused
        ? "Terminal reuse"
        : "Terminal";
    launch.command = `claude${continueSession ? " --continue" : ""} (${queueNote})`;
  } else {
    throw new Error("只支持 CLI 启动：Cursor Agent 或 Claude Code");
  }

  appendLaunchLog(
    outLog,
    `[${new Date().toISOString()}] spawned mode=${launch.mode} pid=${launch.pid} continue=${launch.continueSession} reused=${Boolean(launch.reused)}`,
  );
  return launch;
}

/** True when Brief text implies the product needs a public/hosted deploy. */
function needsGithubDeploy(text) {
  return /部署|上线|托管|公网|域名|发布站点|发布网站|github\s*pages|gh-pages|\bdeploy\b|\bhosting\b|\bhosted\b|put\s+online|go\s+live|public\s+url|publish\s+(the\s+)?(site|app|page)/i.test(
    String(text || ""),
  );
}

function dispatchToRepo({ jobId, repoPath, agentId, startCommand }) {
  const live = readLiveJob(jobId);
  // Stay on the user's chosen folder: bootstrap git + install Duaer there.
  const probe = probeRepo(repoPath, {
    bootstrap: true,
    exact: true,
    ensureDuaer: true,
  });
  const branch =
    String(live.job.branch || "").trim() || `feat/${slugify(live.id)}`;
  const worktreeId = branch.replace(/\//g, "-");
  const worktreePath = path.join(probe.path, ".worktree", worktreeId);

  if (fs.existsSync(worktreePath)) {
    throw new Error(`worktree 已存在：${worktreePath}`);
  }
  if (hasLocalBranch(probe.path, branch)) {
    throw new Error(`分支已存在：${branch}（请换目标或删分支后再派工）`);
  }

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
  const deployNeeded = needsGithubDeploy(
    [live.spec, goalBody, acceptBody, assumeBody].join("\n"),
  );
  const productSpec = `# Feature Specification: ${goal}

**Feature Branch**: \`${branch}\`

**Created**: ${today}

**Status**: Dispatched (现场开发)

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

Dispatched from 现场开发 into product worktree \`${worktreePath}\`.
${deployNeeded ? "\nDeploy: use GitHub CLI (`gh`) + Actions (see duaer-spec `docs/agent/deploy-github.md`).\n" : ""}
`;

  const deployTasks = deployNeeded
    ? `
- [ ] T004 Deploy with GitHub CLI (\`gh\`) + Actions（默认 Pages 模板：.duaer/templates/deploy-github-pages.yml；公网 URL 写入 preview.url）
`
    : "";

  const productTasks = `# Tasks

- [ ] T001 Implement against this Brief
- [ ] T002 Risk-based verification per testing.md
- [ ] T003 Stamp delivery.json accepted（若有可打开的成品，写入 preview.url）
${deployTasks}
做完一步就立刻把对应项改成 \`- [x]\`，方便现场开发显示进度。

若交付物是页面/静态文件，在 delivery.json 增加：
\`\`\`json
"preview": { "url": "index.html", "label": "查看成品" }
\`\`\`
（也可用 http(s) 地址；相对路径相对 worktree 根目录；若已 GitHub Pages 部署，优先写公网 URL）
`;

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
        deployViaGithubCli: deployNeeded,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const deployPrompt = deployNeeded
    ? `
9. 本需求需要部署：默认走 GitHub CLI 自动化部署（\`gh\` + GitHub Actions），不要默认用 Vercel/Netlify 等第三方 CLI
10. 静态站：复制本 worktree 的 .duaer/templates/deploy-github-pages.yml → .github/workflows/deploy.yml（按构建产物改 path）；不要去其它仓找模板
11. \`gh auth status\`；需要时 \`gh repo create\` / 确保 GitHub remote；合并到 main 后 push；\`gh workflow run\` / \`gh run watch\`
12. 部署成功后把公网 URL 写入 delivery.preview.url（label 可用「查看成品」）
13. 用户要部署即授权本次发布所需的 push / gh 操作（仍禁止 force-push 与无关分支推送）
`
    : `
9. 不要推远程除非用户明确要求
`;

  const defaultPrompt = `Duaer

按 Duaer 数字员工流程在本 worktree 开工（现场开发已派工）。

工作目录: ${worktreePath}
Brief: ${featureDir}
分支: ${branch}
产品仓: ${probe.path}

要求：
1. 只在上述工作目录开工；Duaer 已安装在本目录（AGENTS.md / .duaer）。不要去其它仓库或全局找 Duaer / duaer-spec 源码仓
2. 只做 Brief 范围
3. 按 .duaer/memory/testing.md（若有）做风险验证
4. 每完成 tasks.md 中的一步，立刻把该行改成 - [x]（现场开发靠此显示进度）
5. 完成后 stamp ${path.join(featureDir, "delivery.json")} 为 accepted
6. 若有可打开成品（页面/静态文件/本地服务），在 delivery.json 写入 preview.url（相对 worktree 的路径如 index.html，或 http://localhost:…）
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
    status: "dispatched",
    dispatch,
    agentPrompt,
  };
  fs.writeFileSync(live.jobPath, `${JSON.stringify(nextJob, null, 2)}\n`, "utf8");
  rememberRepo(probe.path, { baseBranch: probe.baseBranch });

  return {
    ok: true,
    jobId: live.id,
    ...dispatch,
    deployViaGithubCli: deployNeeded,
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

const REVISE_PROMPT = `你是「现场开发」改进助手。用户看过成品后提出不满意之处。请把反馈整理成可执行的改进说明。

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
  runGit(probe.path, ["worktree", "add", "-b", branch, worktreePath, base]);
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

  const specPath = path.join(dispatch.featureDir, "spec.md");
  const tasksPath = path.join(dispatch.featureDir, "tasks.md");
  const deliveryPath = path.join(dispatch.featureDir, "delivery.json");

  let specMd = fs.existsSync(specPath)
    ? fs.readFileSync(specPath, "utf8")
    : "";
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

  let tasksMd = fs.existsSync(tasksPath)
    ? fs.readFileSync(tasksPath, "utf8")
    : "# Tasks\n\n";
  const taskBlock = `
- [ ] R${revN}-1 Apply revision: ${restated.change.replace(/\n/g, " ").slice(0, 160)}
- [ ] R${revN}-2 Verify against revision acceptance
- [ ] R${revN}-3 Stamp delivery.json accepted（更新 preview.url）
`;
  fs.writeFileSync(
    tasksPath,
    `${tasksMd.trim()}\n\n## Revision ${revN} tasks\n${taskBlock}\n`,
    "utf8",
  );

  let prevDelivery = null;
  if (fs.existsSync(deliveryPath)) {
    try {
      prevDelivery = JSON.parse(fs.readFileSync(deliveryPath, "utf8"));
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
    throw new Error("未检测到可用 CLI（Cursor Agent / Claude Code）");
  }
  const ok = detected.agents.some((a) => a.id === chosen && a.available);
  if (!ok) {
    throw new Error(`未安装启动器：${chosen}`);
  }

  // After accepted delivery (or recreated worktree), do not use --continue:
  // ended sessions make continue look "enqueued" while the agent never works.
  // Same Terminal queue still applies via launchInTerminal reuse/heartbeat.
  const priorAccepted = prevDelivery?.status === "accepted";
  const continueSession = !recreated && !priorAccepted;

  const defaultPrompt = `Duaer

用户看过成品后不满意，请在同一 worktree 继续改进（现场开发 Revision ${revN}）。
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
1. 只做本轮 Revision ${revN} 范围，不要重做无关功能
2. 立刻把 tasks.md 里 R${revN}-* 勾成 - [x]
3. 改完后 stamp delivery.json 为 accepted，并更新 preview.url
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
  const launch = launchAgent({
    agentId: chosen,
    worktreePath: dispatch.worktreePath,
    agentPrompt,
    logPath,
    featureDir: dispatch.featureDir,
    continueSession,
  });
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

function parseTasksProgress(tasksMd) {
  const tasks = [];
  const lines = String(tasksMd || "").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const text = m[2].trim();
    const idMatch = text.match(/^(T\d+)\b/i);
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
  if (total === 0) current = "暂无任务清单";
  else if (!next) current = "任务已全部勾选 · 等待 delivery accepted";
  else current = `进行中：${next.text}`;
  return {
    total,
    done: doneCount,
    current,
    tasks,
  };
}

function readLogTail(logPath, maxLines = 12) {
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
    "查看成品";

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

function resolveArtifactFile(jobId, relPath) {
  const live = readLiveJob(jobId);
  const dispatch = live.job.dispatch;
  if (!dispatch?.worktreePath && !dispatch?.repoPath) {
    throw new Error("尚未派工");
  }
  const roots = resolveDispatchRoots(dispatch);
  const root = roots.root ? path.resolve(roots.root) : null;
  if (!root || !fs.existsSync(root)) {
    throw new Error("产品目录 / worktree 不存在");
  }
  const rel = String(relPath || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  if (!rel || rel.includes("..")) throw new Error("非法路径");
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error("路径越界");
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    throw new Error("文件不存在");
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
      logTail: [],
      preview: null,
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
  let progress = parseTasksProgress("");
  if (tasksPath && fs.existsSync(tasksPath)) {
    try {
      progress = parseTasksProgress(fs.readFileSync(tasksPath, "utf8"));
    } catch {
      progress = parseTasksProgress("");
    }
  }
  const logPath =
    dispatch.launch?.logPath ||
    (featureDir ? path.join(featureDir, "agent-launch.log") : null);
  const logTail = logPath ? readLogTail(logPath) : [];
  const worktreeExists = roots.worktreeExists;
  const accepted = delivery?.status === "accepted";
  if (accepted && progress.total > 0) {
    progress = {
      ...progress,
      current: worktreeExists
        ? "delivery accepted · 工单完成"
        : "delivery accepted · 已合入 develop（worktree 已清理）",
    };
  } else if (!worktreeExists && roots.source === "primary") {
    progress = {
      ...progress,
      current:
        progress.current ||
        "worktree 已清理；成品与 Brief 在产品仓 develop",
    };
  }
  const preview = resolvePreview({
    delivery: delivery || { status: "open" },
    worktreePath: roots.root,
    jobId: live.id,
  });
  // Only after accept (or during a revise round). Not while first dispatch is still in progress.
  const showPreview =
    accepted ||
    live.job.status === "revising" ||
    Number(live.job.revisionCount || 0) > 0;

  // Persist accepted status when handoff moved Brief to primary
  if (accepted && live.job.status !== "accepted" && roots.source === "primary") {
    try {
      const nextJob = { ...live.job, status: "accepted" };
      fs.writeFileSync(
        live.jobPath,
        `${JSON.stringify(nextJob, null, 2)}\n`,
        "utf8",
      );
    } catch {
      // ignore
    }
  }

  const canRevise =
    Boolean(dispatch.repoPath && fs.existsSync(dispatch.repoPath)) &&
    (accepted ||
      live.job.status === "revising" ||
      Number(live.job.revisionCount || 0) > 0);

  return {
    jobId: live.id,
    status: accepted ? "accepted" : live.job.status,
    dispatch: {
      ...dispatch,
      worktreeExists,
      featureDir: featureDir || dispatch.featureDir,
      resolvedFrom: roots.source,
    },
    delivery,
    progress,
    logTail,
    preview: showPreview ? preview : null,
    canRevise,
    revision: live.job.revisionCount || 0,
    handoffCleaned: !worktreeExists && roots.source === "primary",
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
      const next = writeConfig({
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        model: body.model,
        preferredAgentId: body.preferredAgentId,
      });
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
      });
      send(res, 200, result);
    } catch (err) {
      send(res, 400, {
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
      send(res, 400, {
        error: err instanceof Error ? err.message : "revise failed",
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
    console.log(`现场开发  http://127.0.0.1:${port}`);
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
