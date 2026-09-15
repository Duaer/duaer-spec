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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(PACKAGE_ROOT, "web", "live-dev");

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
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      baseUrl: String(raw.baseUrl || process.env.DUAER_LIVE_BASE_URL || "").trim(),
      apiKey: String(raw.apiKey || process.env.DUAER_LIVE_API_KEY || "").trim(),
      model: String(raw.model || process.env.DUAER_LIVE_MODEL || "").trim(),
    };
  } catch {
    return { baseUrl: "", apiKey: "", model: "" };
  }
}

function writeConfig(partial) {
  ensureLiveDirs();
  const cur = readConfig();
  const next = {
    baseUrl: partial.baseUrl !== undefined ? String(partial.baseUrl).trim() : cur.baseUrl,
    apiKey: partial.apiKey !== undefined ? String(partial.apiKey).trim() : cur.apiKey,
    model: partial.model !== undefined ? String(partial.model).trim() : cur.model,
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
    liveRoot: liveRoot(),
    jobsRoot: jobsRoot(),
  };
}

function parseArgs(argv) {
  const out = {
    cmd: "serve",
    port: 8787,
    baseUrl: null,
    apiKey: null,
    model: null,
  };
  const args = argv.slice(2);
  if (args[0] === "config") {
    out.cmd = "config";
    args.shift();
  }
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--port" && args[i + 1]) out.port = Number(args[++i]) || 8787;
    else if (a === "--base-url" && args[i + 1]) out.baseUrl = args[++i];
    else if (a === "--api-key" && args[i + 1]) out.apiKey = args[++i];
    else if (a === "--model" && args[i + 1]) out.model = args[++i];
    else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
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
3. 四块够清楚、验收可检查时，set ready=true，并给一句请用户确认的话。
4. 不要写代码。不要假设用户仓库路径。
5. 必须只输出一个 JSON 对象，不要 markdown 围栏：
{"reply":"对用户说的话","goal":"...","outOfScope":"...","acceptance":"...","assumptions":"...","ready":false,"options":["可选A","可选B"]}`;

async function callChatModel(cfg, messages) {
  const base = cfg.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(`模型调用失败：${msg}`);
  }
  const content = String(json?.choices?.[0]?.message?.content || "").trim();
  if (!content) throw new Error("模型返回空内容");
  return parseModelJson(content);
}

function parseModelJson(content) {
  let text = content.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  const obj = JSON.parse(text);
  return {
    reply: String(obj.reply || "").trim() || "请继续补充。",
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

function writeBrief(payload) {
  const goal = String(payload.goal || "").trim();
  const outOfScope = String(payload.outOfScope || "").trim();
  const acceptance = String(payload.acceptance || "").trim();
  const assumptions = String(payload.assumptions || "").trim();
  const rawAsk = String(payload.rawAsk || "").trim();
  if (!goal || !acceptance) throw new Error("goal and acceptance are required");

  const { root, nextNum } = nextJobDir();
  const slug = slugify(goal);
  const dirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(root, dirName);
  fs.mkdirSync(featureDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const branchHint = `feat/${slug}`;
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

## Notes

Confirmed via 现场开发. Workspace is ~/.duaer/live (isolated from product repos).
Copy this Brief into a product repo's \`.duaer/specs/\` when the digital employee starts work there.
`;

  const tasks = `# Tasks

- [ ] T001 Pick/create the target product repository (do not invent paths)
- [ ] T002 Copy or recreate this Brief under that repo's .duaer/specs/
- [ ] T003 Isolate worktree \`${branchHint}\` from develop
- [ ] T004 Implement against this Brief
- [ ] T005 Risk-based verification; delivery.json accepted
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
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const agentPrompt = `按 Duaer 数字员工流程开工（Brief 在现场开发隔离区，勿与无关业务仓混淆）。

Brief 目录: ${featureDir}
（也可用相对路径：~/.duaer/live/jobs/${dirName}）

要求：
1. 先确认要在哪个产品仓库干活，把 Brief 放进该仓 .duaer/specs/
2. 从 develop 建 worktree \`${branchHint}\`
3. 只做 Brief 范围；按 testing.md 验证后 stamp delivery.json
4. 不要推远程除非用户明确要求
`;

  return {
    ok: true,
    featureDir,
    relativeDir: `~/.duaer/live/jobs/${dirName}`,
    branch: branchHint,
    agentPrompt,
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url || "/", "http://local");

  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, { ok: true, ...publicConfig() });
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
        content: `当前确认卡草稿：\n${JSON.stringify(card)}\n请继续对话并返回 JSON。`,
      });
      const result = await callChatModel(cfg, messages);
      send(res, 200, result);
    } catch (err) {
      send(res, 500, {
        error: err instanceof Error ? err.message : "chat failed",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/confirm") {
    try {
      const body = await readJson(req);
      const result = writeBrief(body);
      send(res, 200, result);
    } catch (err) {
      send(res, 400, {
        error: err instanceof Error ? err.message : "confirm failed",
      });
    }
    return;
  }

  send(res, 404, { error: "not found" });
}

function cmdConfig(opts) {
  const partial = {};
  if (opts.baseUrl != null) partial.baseUrl = opts.baseUrl;
  if (opts.apiKey != null) partial.apiKey = opts.apiKey;
  if (opts.model != null) partial.model = opts.model;
  if (!Object.keys(partial).length) {
    const pub = publicConfig();
    console.log(JSON.stringify(pub, null, 2));
    if (!pub.ready) {
      console.log(`
未就绪。请配置模型，例如：

  duaer live config --base-url https://api.openai.com/v1 --api-key sk-... --model gpt-4o-mini

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
  duaer live config --base-url <OpenAI兼容地址> --api-key <key> --model <name>
或在页面里填写。
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
  serve(opts.port);
}

main();
