/**
 * 现场开发 — local server: UI + confirm → write Duaer Brief.
 * Usage: node bin/duaer-live.mjs [projectRoot] [--port 8787]
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const WEB_ROOT = path.join(PACKAGE_ROOT, "web", "live-dev");

function parseArgs(argv) {
  let port = 8787;
  let root = process.cwd();
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--port" && argv[i + 1]) {
      port = Number(argv[++i]) || 8787;
    } else if (!a.startsWith("-")) {
      root = path.resolve(a);
    }
  }
  return { port, root };
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
  if (filePath.endsWith(".svg")) return "image/svg+xml";
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

function nextSpecDir(projectRoot) {
  const specsRoot = path.join(projectRoot, ".duaer", "specs");
  fs.mkdirSync(specsRoot, { recursive: true });
  const existing = fs.readdirSync(specsRoot).filter((n) => /^\d{3}-/.test(n));
  let max = 0;
  for (const name of existing) {
    const n = Number(name.slice(0, 3));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return { specsRoot, nextNum: max + 1 };
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

function writeBrief(projectRoot, payload) {
  const goal = String(payload.goal || "").trim();
  const outOfScope = String(payload.outOfScope || "").trim();
  const acceptance = String(payload.acceptance || "").trim();
  const assumptions = String(payload.assumptions || "").trim();
  const rawAsk = String(payload.rawAsk || "").trim();
  if (!goal || !acceptance) {
    throw new Error("goal and acceptance are required");
  }

  const { specsRoot, nextNum } = nextSpecDir(projectRoot);
  const slug = slugify(goal);
  const dirName = `${String(nextNum).padStart(3, "0")}-${slug}`;
  const featureDir = path.join(specsRoot, dirName);
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

Confirmed via 现场开发 web before digital-employee implement.
`;

  const tasks = `# Tasks

- [ ] T001 Isolate worktree \`${branchHint}\` from develop
- [ ] T002 Implement against this Brief
- [ ] T003 Risk-based verification per \`.duaer/memory/testing.md\`
- [ ] T004 Converge + delivery.json accepted
`;

  fs.writeFileSync(path.join(featureDir, "spec.md"), spec, "utf8");
  fs.writeFileSync(path.join(featureDir, "tasks.md"), tasks, "utf8");

  const active = {
    specDir: `.duaer/specs/${dirName}`,
    branch: branchHint,
    startedAt: new Date().toISOString(),
    source: "live-dev",
  };
  const duaerDir = path.join(projectRoot, ".duaer");
  fs.mkdirSync(duaerDir, { recursive: true });
  fs.writeFileSync(
    path.join(duaerDir, "active-job.json"),
    `${JSON.stringify(active, null, 2)}\n`,
    "utf8",
  );

  const agentPrompt = `按 Duaer 数字员工流程开工。

Brief: .duaer/specs/${dirName}/spec.md
Tasks: .duaer/specs/${dirName}/tasks.md
active-job: .duaer/active-job.json

要求：
1. 从 develop 建 worktree \`${branchHint}\`（勿与 Brief 文件夹同名）
2. 只做 Brief 范围内的事
3. 按 testing.md 验证后 stamp delivery.json accepted
4. 合入 local develop；不要推远程除非我明确要求
`;

  return {
    ok: true,
    featureDir: `.duaer/specs/${dirName}`,
    branch: branchHint,
    agentPrompt,
  };
}

async function handleApi(req, res, projectRoot) {
  const url = new URL(req.url || "/", "http://local");
  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, {
      ok: true,
      projectRoot,
      hasDuaer: fs.existsSync(path.join(projectRoot, ".duaer")),
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/confirm") {
    try {
      const body = await readJson(req);
      const result = writeBrief(projectRoot, body);
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

function main() {
  const { port, root } = parseArgs(process.argv);
  if (!fs.existsSync(WEB_ROOT)) {
    console.error("Missing web/live-dev — broken package install?");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    if ((req.url || "").startsWith("/api/")) {
      void handleApi(req, res, root);
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res);
      return;
    }
    send(res, 405, { error: "method not allowed" });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`现场开发  http://127.0.0.1:${port}`);
    console.log(`项目根目录  ${root}`);
    console.log("确认后会写入该目录下的 .duaer/specs/ …");
  });
}

main();
