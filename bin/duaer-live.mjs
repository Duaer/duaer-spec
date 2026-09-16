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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(PACKAGE_ROOT, "web", "live-dev");

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
  };
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

async function callChatModel(cfg, messages, systemPrompt = SYSTEM_PROMPT) {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const body = {
    model: cfg.model,
    temperature: systemPrompt === ACCEPT_PROMPT ? 0.15 : 0.3,
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

async function streamChatResponse(cfg, messages, res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  let full = "";
  let emitted = 0;
  let inJson = false;
  try {
    for await (const chunk of streamChatModel(cfg, messages)) {
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
  const probe = probeRepo(target, { bootstrap: true });
  rememberRepo(probe.path, { baseBranch: probe.baseBranch });
  console.log(probe.bootstrapped ? "已自动 git init 并登记" : "已登记产品仓库", probe.path);
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

function resolveGitTop(repoPath) {
  const abs = normalizeRepoPath(repoPath);
  if (!abs || abs === path.sep) throw new Error("请填写仓库绝对路径");
  if (!fs.existsSync(abs)) throw new Error(`路径不存在：${abs}`);

  // 1) This folder (or inside a repo)
  let top = tryGitTop(abs);
  if (top) return top;

  // 2) Walk up — user may have picked src/ or packages/foo
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

  const e = new Error(
    `「${abs}」不是 git 仓库（没有 .git）。有文件不等于已 git init——请选带 .git 的项目根目录，或在该目录执行：git init -b develop && git add -A && git commit -m init`,
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

function probeRepo(repoPath, { bootstrap = false } = {}) {
  let bootstrapped = false;
  let top;
  try {
    top = resolveGitTop(repoPath);
  } catch (err) {
    if (!bootstrap || err?.code !== "NOT_GIT" || !err.path) throw err;
    // Do not bootstrap home / obvious parent folders with many children.
    const kids = listChildGitRepos(err.path, { max: 3 });
    if (kids.length > 0) throw err;
    bootstrapGitRepo(err.path);
    bootstrapped = true;
    top = resolveGitTop(err.path);
  }
  const base = ensureBaseBranch(top, { bootstrap });
  if (base.created) bootstrapped = true;
  return {
    path: top,
    name: path.basename(top) || top,
    baseBranch: base.baseBranch,
    hasDuaer: fs.existsSync(path.join(top, ".duaer")),
    bootstrapped,
    baseBranchCreated: base.created,
  };
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
  const r = spawnSync("which", [cmd], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const p = String(r.stdout || "")
    .trim()
    .split("\n")[0];
  return p || null;
}

/** Digital-employee / editor launchers detectable on PATH. */
const AGENT_CATALOG = [
  {
    id: "cursor-agent",
    label: "Cursor Agent",
    kind: "worker",
    hint: "后台自动开工 + 打开该 worktree",
  },
  {
    id: "claude",
    label: "Claude Code",
    kind: "worker",
    hint: "后台自动开工 + 尽量打开 worktree",
  },
  {
    id: "cursor",
    label: "Cursor（仅打开）",
    kind: "open",
    hint: "只打开仓库，不发任务",
  },
  {
    id: "code",
    label: "VS Code（仅打开）",
    kind: "open",
    hint: "只打开仓库，不发任务",
  },
  {
    id: "none",
    label: "仅派工不启动",
    kind: "none",
    hint: "只建 worktree / Brief",
  },
];

function detectAgents() {
  const preferredRaw = readConfig().preferredAgentId || "";
  const preferredMeta = AGENT_CATALOG.find((a) => a.id === preferredRaw);
  // Ignore remembered open-only prefs (they only open IDE, no task)
  const preferred =
    preferredMeta?.kind === "worker" ? preferredRaw : "";
  const agentBin = whichCmd("agent");
  const cursorBin = whichCmd("cursor");
  const claudeBin = whichCmd("claude");
  const codeBin = whichCmd("code");

  const installed = [];
  if (agentBin || cursorBin) {
    installed.push({
      ...AGENT_CATALOG.find((a) => a.id === "cursor-agent"),
      available: true,
      command: agentBin ? "agent" : "cursor agent",
      path: agentBin || cursorBin,
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
  if (cursorBin) {
    installed.push({
      ...AGENT_CATALOG.find((a) => a.id === "cursor"),
      available: true,
      command: "cursor",
      path: cursorBin,
    });
  }
  if (codeBin) {
    installed.push({
      ...AGENT_CATALOG.find((a) => a.id === "code"),
      available: true,
      command: "code",
      path: codeBin,
    });
  }
  installed.push({
    ...AGENT_CATALOG.find((a) => a.id === "none"),
    available: true,
    command: null,
    path: null,
  });

  const ids = new Set(installed.map((a) => a.id));
  const missing = AGENT_CATALOG.filter(
    (a) => a.id !== "none" && !ids.has(a.id),
  ).map((a) => ({ ...a, available: false, command: null, path: null }));

  return {
    preferredAgentId: preferred && ids.has(preferred) ? preferred : "",
    agents: installed,
    missing,
  };
}

function appendLaunchLog(logPath, line) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, "utf8");
}

function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** Open a visible terminal session that runs the agent command. */
function launchInTerminal({ cwd, commandLine, logPath }) {
  const stamped = `[${new Date().toISOString()}] terminal: ${commandLine}`;
  appendLaunchLog(logPath, stamped);

  if (process.platform === "darwin") {
    const script = `cd ${shellSingleQuote(cwd)} && ${commandLine}; echo; echo '[duaer] agent session ended — press Enter to close'; read _`;
    const child = spawn(
      "osascript",
      [
        "-e",
        'tell application "Terminal" to activate',
        "-e",
        `tell application "Terminal" to do script ${shellSingleQuote(script)}`,
      ],
      { detached: true, stdio: "ignore" },
    );
    child.unref();
    return { pid: child.pid ?? null, mode: "terminal" };
  }

  // Linux / other: try gnome-terminal / x-terminal-emulator / fall back to detached shell
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
    return { pid: child.pid ?? null, mode: "terminal" };
  }

  const child = spawn("bash", ["-lc", commandLine], {
    detached: true,
    cwd,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  return { pid: child.pid ?? null, mode: "detached" };
}

function openEditor(cmd, worktreePath, logPath) {
  const child = spawn(cmd, [worktreePath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  appendLaunchLog(
    logPath,
    `[${new Date().toISOString()}] open ${cmd} ${worktreePath} pid=${child.pid}`,
  );
  return child.pid ?? null;
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

function launchAgent({ agentId, worktreePath, agentPrompt, logPath }) {
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
  };

  if (id === "none") {
    return launch;
  }

  if (!worktreePath || !fs.existsSync(worktreePath)) {
    throw new Error("worktree 不存在，无法启动");
  }

  const prompt = String(agentPrompt || "").trim();
  const outLog =
    logPath ||
    path.join(worktreePath, ".duaer", "live-agent-launch.log");
  launch.logPath = outLog;

  if (id === "cursor" || id === "code") {
    launch.pid = openEditor(id, worktreePath, outLog);
    launch.mode = "open";
    return launch;
  }

  if (!prompt) throw new Error("缺少开工 prompt");

  appendLaunchLog(
    outLog,
    `[${launch.launchedAt}] start ${id} cwd=${worktreePath} (non-interactive)`,
  );

  const promptFile = path.join(
    path.dirname(outLog),
    "agent-launch-prompt.txt",
  );
  fs.writeFileSync(promptFile, `${prompt}\n`, "utf8");

  if (id === "cursor-agent") {
    // Non-interactive background run + open the named worktree in Cursor
    // so the user can watch/operate the same folder the agent is editing.
    if (whichCmd("cursor")) {
      openEditor("cursor", worktreePath, outLog);
    }
    const agentBin = whichCmd("agent");
    const cmd = agentBin ? agentBin : "cursor";
    const args = agentBin
      ? ["--workspace", worktreePath, "--trust", "-p", "--force", prompt]
      : [
          "agent",
          "--workspace",
          worktreePath,
          "--trust",
          "-p",
          "--force",
          prompt,
        ];
    launch.pid = spawnBackgroundWorker({
      cmd,
      args,
      cwd: worktreePath,
      logPath: outLog,
    });
    launch.mode = "background";
    launch.openedWorktree = true;
    launch.command = agentBin
      ? "agent -p --force --trust"
      : "cursor agent -p --force --trust";
  } else if (id === "claude") {
    if (whichCmd("cursor")) {
      openEditor("cursor", worktreePath, outLog);
      launch.openedWorktree = true;
    } else if (whichCmd("code")) {
      openEditor("code", worktreePath, outLog);
      launch.openedWorktree = true;
    }
    launch.pid = spawnBackgroundWorker({
      cmd: "claude",
      args: ["--bg", prompt],
      cwd: worktreePath,
      logPath: outLog,
    });
    launch.mode = "background";
    launch.command = "claude --bg";
  } else {
    throw new Error(`未知启动器：${id}`);
  }

  appendLaunchLog(
    outLog,
    `[${new Date().toISOString()}] spawned mode=${launch.mode} pid=${launch.pid}`,
  );
  return launch;
}

function dispatchToRepo({ jobId, repoPath, agentId }) {
  const live = readLiveJob(jobId);
  const probe = probeRepo(repoPath, { bootstrap: true });
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

  const specsRoot = path.join(worktreePath, ".duaer", "specs");
  const nextNum = nextSpecNum(specsRoot);
  const slug = live.id.replace(/^\d{3}-/, "") || slugify(branch);
  const specDirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(specsRoot, specDirName);
  fs.mkdirSync(featureDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const goalMatch = live.spec.match(/^# Feature Specification:\s*(.+)$/m);
  const goal = goalMatch ? goalMatch[1].trim() : live.id;
  const productSpec = `# Feature Specification: ${goal}

**Feature Branch**: \`${branch}\`

**Created**: ${today}

**Status**: Dispatched (现场开发)

**Live job**: \`~/.duaer/live/jobs/${live.id}\`

## Goal
${extractSection(live.spec, "Goal") || goal}

## Out of scope
${extractSection(live.spec, "Out of scope") || "- (none listed)"}

## Acceptance
${extractSection(live.spec, "Acceptance") || ""}

## Assumptions
${extractSection(live.spec, "Assumptions") || "- (none)"}

## Notes

Dispatched from 现场开发 into product worktree \`${worktreePath}\`.
`;

  const productTasks = `# Tasks

- [ ] T001 Implement against this Brief
- [ ] T002 Risk-based verification per testing.md
- [ ] T003 Stamp delivery.json accepted

做完一步就立刻把对应项改成 \`- [x]\`，方便现场开发显示进度。
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
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const agentPrompt = `按 Duaer 数字员工流程在本 worktree 开工（现场开发已派工）。

工作目录: ${worktreePath}
Brief: ${featureDir}
分支: ${branch}

要求：
1. 只做 Brief 范围
2. 按 .duaer/memory/testing.md（若有）做风险验证
3. 每完成 tasks.md 中的一步，立刻把该行改成 - [x]（现场开发靠此显示进度）
4. 完成后 stamp ${path.join(featureDir, "delivery.json")} 为 accepted
5. 不要推远程除非用户明确要求
6. 合入 develop 并 handoff 清理 worktree
`;

  const chosen =
    String(agentId || "").trim() ||
    readConfig().preferredAgentId ||
    "none";
  const logPath = path.join(featureDir, "agent-launch.log");
  const launch = launchAgent({
    agentId: chosen,
    worktreePath,
    agentPrompt,
    logPath,
  });
  if (chosen && chosen !== "none") {
    rememberPreferredAgent(chosen);
  }

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

function dispatchStatus(jobId) {
  const live = readLiveJob(jobId);
  const dispatch = live.job.dispatch || null;
  if (!dispatch?.worktreePath) {
    return {
      jobId: live.id,
      status: live.job.status || "confirmed",
      dispatch: null,
      delivery: null,
      progress: null,
      logTail: [],
    };
  }
  const deliveryPath = path.join(dispatch.featureDir, "delivery.json");
  let delivery = null;
  if (fs.existsSync(deliveryPath)) {
    try {
      delivery = JSON.parse(fs.readFileSync(deliveryPath, "utf8"));
    } catch {
      delivery = { status: "invalid" };
    }
  }
  const tasksPath = path.join(dispatch.featureDir, "tasks.md");
  let progress = parseTasksProgress("");
  if (fs.existsSync(tasksPath)) {
    try {
      progress = parseTasksProgress(fs.readFileSync(tasksPath, "utf8"));
    } catch {
      progress = parseTasksProgress("");
    }
  }
  const logPath =
    dispatch.launch?.logPath ||
    path.join(dispatch.featureDir, "agent-launch.log");
  const logTail = readLogTail(logPath);
  const worktreeExists = fs.existsSync(dispatch.worktreePath);
  const accepted = delivery?.status === "accepted";
  if (accepted && progress.total > 0) {
    progress = {
      ...progress,
      current: "delivery accepted · 工单完成",
    };
  }
  return {
    jobId: live.id,
    status: accepted ? "accepted" : live.job.status,
    dispatch: { ...dispatch, worktreeExists },
    delivery,
    progress,
    logTail,
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url || "/", "http://local");

  if (req.method === "GET" && url.pathname === "/api/health") {
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
      messages.push({
        role: "user",
        content: `当前确认卡草稿：\n${JSON.stringify(card)}\n请继续对话。先写对用户说的话，再 <<<JSON>>> 与卡片 JSON。`,
      });
      const wantStream = body.stream !== false;
      if (wantStream) {
        await streamChatResponse(cfg, messages, res);
        return;
      }
      const result = await callChatModel(cfg, messages);
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
      const probe = probeRepo(chosen, { bootstrap: true });
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
      const probe = probeRepo(body.path, { bootstrap: true });
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
