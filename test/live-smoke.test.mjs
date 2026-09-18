/**
 * Live desk L3 smoke — no paid LLM.
 * Starts a mock OpenAI-compatible server + duaer-live on ephemeral ports.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIVE_BIN = path.join(ROOT, "bin", "duaer-live.mjs");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("no port"));
        return;
      }
      resolve(addr.port);
    });
    server.on("error", reject);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function mockCompletion(body) {
  const system = String(body?.messages?.[0]?.content || "");
  const user = String(body?.messages?.at(-1)?.content || "");
  const isFix = system.includes("需求修正助手") || system.includes("FIX");
  const isAccept =
    system.includes("需求验收官") ||
    user.includes("请验收") ||
    system.includes("自动验收");

  let content;
  if (isFix) {
    content = JSON.stringify({
      summary: "smoke fix",
      goal: "Ship live L3 smoke suite for validate gate",
      outOfScope: "No Playwright browser automation",
      acceptance: "npm run test:live passes with mock LLM",
      assumptions: "Mock OpenAI server is enough for CI",
    });
  } else if (isAccept) {
    content = JSON.stringify({
      passed: true,
      summary: "smoke accept",
      issues: [],
      goal: "Ship live L3 smoke suite for validate gate",
      outOfScope: "No Playwright browser automation",
      acceptance: "npm run test:live passes with mock LLM",
      assumptions: "Mock OpenAI server is enough for CI",
    });
  } else {
    content = `ok\n<<<JSON>>>\n${JSON.stringify({
      reply: "smoke chat",
      goal: "demo",
      outOfScope: "",
      acceptance: "done",
      assumptions: "",
    })}`;
  }
  return {
    id: "smoke",
    choices: [{ message: { role: "assistant", content } }],
  };
}

async function startMockLlm() {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url?.includes("/chat/completions")) {
      try {
        const body = await readJson(req);
        const payload = JSON.stringify(mockCompletion(body));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(payload);
      } catch (err) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });
  const port = await listen(server);
  return {
    port,
    baseUrl: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function waitForHttp(url, { timeoutMs = 15000 } = {}) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 400) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw lastErr || new Error(`timeout waiting for ${url}`);
}

async function startLive({ home, port, baseUrl }) {
  fs.mkdirSync(path.join(home, "live"), { recursive: true });
  fs.writeFileSync(
    path.join(home, "live", "config.json"),
    JSON.stringify(
      {
        baseUrl,
        apiKey: "smoke-key",
        model: "smoke-model",
      },
      null,
      2,
    ),
  );
  const child = spawn(process.execPath, [LIVE_BIN, "--port", String(port)], {
    cwd: ROOT,
    env: {
      ...process.env,
      DUAER_HOME: home,
      DUAER_NO_UPDATE_CHECK: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr += d.toString();
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForHttp(`${base}/`);
  } catch (err) {
    child.kill("SIGKILL");
    throw new Error(`live failed to start: ${err}; stderr=${stderr}`);
  }
  return {
    base,
    stop: () =>
      new Promise((resolve) => {
        child.once("exit", () => resolve());
        child.kill("SIGTERM");
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 2000);
      }),
  };
}

async function freePort() {
  const server = http.createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test("live L3 smoke: desk shell + validate gate", async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-live-smoke-"));
  const mock = await startMockLlm();
  const port = await freePort();
  const live = await startLive({
    home,
    port,
    baseUrl: mock.baseUrl,
  });

  t.after(async () => {
    await live.stop();
    await mock.close();
    fs.rmSync(home, { recursive: true, force: true });
  });

  const html = await (await fetch(`${live.base}/`)).text();
  assert.match(html, /chat-panel/);
  assert.match(html, /card-panel/);
  assert.match(html, /progress-col/);
  assert.match(html, /req-section/);
  assert.match(html, /id="goalView"/);
  assert.match(html, /id="confirm"/);

  const css = await (await fetch(`${live.base}/styles.css`)).text();
  assert.match(css, /grid-template-columns/);
  assert.match(css, /req-structured/);
  assert.match(css, /width:\s*100%/);
  assert.match(css, /\.top\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.card-panel\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.chat-panel,\s*\.card-panel,\s*\.progress-col/s);
  assert.match(css, /progress-meter|progress-empty-title/);
  assert.match(html, /progress-empty-title|progress\.emptyTitle/);

  const js = await (await fetch(`${live.base}/app.js`)).text();
  assert.match(js, /validationAllowsSend/);
  assert.match(js, /progress-meter-fill|meterFill/);
  assert.match(js, /chatAllowed|syncComposerEnabled|bot\.chatLockedHint/);
  assert.match(js, /USER_SCROLL_HOLD_MS|wirePanelScrollHold|progressFocusKey/);
  assert.match(js, /wasHidden/);
  assert.match(html, /chat-empty-steps|chat\.emptyStep1/);
  assert.match(js, /enrichChatOptions|choice-chip|chat\.optFeature/);
  const liveBin = fs.readFileSync(LIVE_BIN, "utf8");
  assert.match(liveBin, /enrichChatOptions/);
  assert.match(liveBin, /必须在 JSON 的 options|必须在 options 填/);
  assert.doesNotMatch(html, /header\.beginner|top-beginner|小白也能做FED/);
  assert.doesNotMatch(html, /chat-empty-title|data-i18n="chat\.emptyTitle"/);
  const i18nSrc = await (await fetch(`${live.base}/i18n.js`)).text();
  assert.doesNotMatch(i18nSrc, /header\.beginner|小白也能做FED|Beginners can do FED too|chat\.emptyTitle/);
  assert.match(css, /choice-chip/);
  assert.match(css, /rgba\(127,\s*149,\s*168/);
  assert.doesNotMatch(
    css,
    /\.choice-chip\s*\{[^}]*var\(--register\)/,
  );
  assert.match(js, /structuredHtml/);
  assert.match(js, /paintReqEditor|reqEditModel|serializeReqEdit|req-item-input/);
  assert.match(js, /card\.reqAdd/);
  assert.match(css, /req-item-edit|req-add-item/);
  assert.match(js, /\/api\/validate/);
  assert.match(js, /card\.acceptHint|acceptHint/);
  assert.match(js, /agentRedetect|is-missing|agent-chip-cmd/);
  assert.match(js, /autoHandleFromGate|autoFixCard|card\.autoHandle/);
  assert.match(html, /id="agentRedetect"/);
  assert.match(html, /id="autoFixCard"/);
  assert.match(html, /id="agentInstall"/);
  assert.match(html, /id="projectActivate"/);
  assert.match(html, /setup-guide|setup\.guideTitle/);
  assert.match(html, /setupCmdCursor|cursor\.com\/install/);
  assert.match(html, /@anthropic-ai\/claude-code/);
  assert.match(html, /id="cfgOpen"/);
  assert.match(html, /id="githubStars"|class="[^"]*top-btn[^"]*github-btn/);
  assert.match(html, /class="top-btn"/);
  assert.match(js, /refreshGithubStars|\/api\/github|formatStarCount/);
  assert.match(liveBin, /\/api\/github|refreshGithubMeta|stargazers_count/);
  assert.match(html, /id="settingsPanel"|settings-drawer/);
  assert.match(js, /setup\.guideOther|cfgOpen|setSettingsOpen/);
  assert.match(html, /architecturePanel|architectureFrame/);
  assert.match(js, /beginArchitectureDesign|\/api\/architecture\/render/);
  assert.match(html, /id="projectTitle"/);
  assert.match(html, /id="projectDescription"/);
  assert.match(html, /id="dispatchProjectSummary"|dispatch-project-summary/);
  assert.match(js, /repoPickBlock|dispatch\.projectSummary/);
  assert.match(js, /bot\.needProject|state\.projectPath/);
  assert.match(js, /persistProjectChat|loadProjectChatIntoUi/);
  assert.match(js, /markDispatchDone|applyDispatchStateFromStatus|tryRecoverDispatchDone/);
  assert.match(js, /openResultFolder|\/api\/reveal/);
  assert.match(html, /id="previewOpenFolder"/);
  assert.match(html, /id="previewService"|previewStartService|preview-service/);
  assert.doesNotMatch(html, /id="progressResult"/);
  assert.match(js, /architecturePrevious|architectureFingerprint|architectureRedesign/);
  assert.match(html, /architecturePreviousBlock|architectureRedesign/);
  assert.match(liveBin, /resolvePreviewPayload|live-preview/);
  assert.match(liveBin, /\/api\/preview\/ensure|ensureLocalPreviewService/);
  assert.match(liveBin, /\/api\/preview\/status|probeLocalPreviewStatus/);
  assert.match(js, /ensureAndOpenPreview|refreshPreviewServiceStatus/);
  assert.match(js, /appendReviseMessagesToLog|restoreReviseDeskUi/);
  assert.match(js, /\/api\/projects/);
  assert.match(liveBin, /\/api\/projects\/chat/);
  assert.match(liveBin, /NEED_PROJECT/);

  const mjsRes = await fetch(`${live.base}/structured-html.mjs`);
  assert.equal(mjsRes.status, 200);
  const mjsType = mjsRes.headers.get("content-type") || "";
  assert.match(mjsType, /javascript/);
  const mjsBody = await mjsRes.text();
  assert.match(mjsBody, /structuredHtml|normalizeReqText|reqEditModel/);

  const health = await (await fetch(`${live.base}/api/health`)).json();
  assert.equal(health.ready, true);

  const gh = await (await fetch(`${live.base}/api/github`)).json();
  assert.match(String(gh.url || ""), /github\.com\/fujiezee\/duaer-spec/);
  assert.ok(
    gh.stars === null || typeof gh.stars === "number",
    "stars null or number",
  );

  const empty = await fetch(`${live.base}/api/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "", acceptance: "" }),
  });
  assert.equal(empty.status, 422);
  const emptyBody = await empty.json();
  assert.equal(emptyBody.passed, false);

  const short = await fetch(`${live.base}/api/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: "ab", acceptance: "cd" }),
  });
  assert.equal(short.status, 422);
  const shortBody = await short.json();
  assert.equal(shortBody.passed, false);
  assert.ok((shortBody.issues || []).length >= 1);

  const vague = await fetch(`${live.base}/api/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      goal: "Polish the homepage design a bit",
      acceptance: "Make it look better and nicer overall",
    }),
  });
  assert.equal(vague.status, 422);
  const vagueBody = await vague.json();
  assert.equal(vagueBody.passed, false);

  const goodCard = {
    goal: "Ship live L3 smoke suite for validate gate",
    outOfScope: "No Playwright browser automation",
    acceptance: "npm run test:live passes with mock LLM",
    assumptions: "Mock OpenAI server is enough for CI",
  };
  const ok = await fetch(`${live.base}/api/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(goodCard),
  });
  assert.equal(ok.status, 200);
  const okBody = await ok.json();
  assert.equal(okBody.passed, true);

  const fix = await fetch(`${live.base}/api/validate/fix`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...goodCard,
      issues: ["acceptance should mention npm run test:live"],
    }),
  });
  assert.equal(fix.status, 200);
  const fixBody = await fix.json();
  assert.equal(fixBody.passed, true);
  assert.ok(fixBody.card?.goal);
});
