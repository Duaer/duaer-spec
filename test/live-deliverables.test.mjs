/**
 * Stage deliverables HTML page.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildDeliverablesModel,
  renderDeliverablesHtml,
  writeDeliverablesHtmlFile,
} from "../bin/live-deliverables.mjs";

test("buildDeliverablesModel includes req doc timeline and confirmation", () => {
  const model = buildDeliverablesModel(
    {
      projectPath: "/tmp/demo-app",
      updatedAt: "2026-09-19T01:00:00.000Z",
      modules: [
        {
          id: "auth",
          title: "Auth",
          status: "confirmed",
          card: {
            goal: "Login page",
            outOfScope: "SSO",
            acceptance: "Open /login",
            assumptions: "",
          },
        },
        {
          id: "dash",
          title: "Dash",
          status: "confirmed",
          card: {
            goal: "Dashboard",
            outOfScope: "",
            acceptance: "See KPI cards",
            assumptions: "",
          },
        },
      ],
      reviseCards: [
        {
          revision: 1,
          goal: "Add export",
          outOfScope: "",
          acceptance: "CSV download works",
          assumptions: "",
        },
      ],
      architecture: {
        url: "/api/architecture/abc.html",
        summary: "Web + API",
        confirmed: true,
      },
      taskPool: { tasks: [{ id: "T001", title: "Impl auth", dependsOn: [] }] },
      workerCount: 2,
      jobId: "001-demo",
    },
    { lang: "zh" },
  );
  assert.equal(model.stages[0].id, "requirements");
  assert.equal(model.stages[0].status, "done");
  const reqDoc = model.stages[0].artifacts.find((a) => a.id === "req-doc");
  assert.ok(reqDoc.ready);
  assert.equal(reqDoc.versions.length, 2);
  assert.match(reqDoc.versions[0].label, /初版/);
  assert.match(reqDoc.versions[1].label, /改进/);
  const conf = model.stages[0].artifacts.find((a) => a.id === "req-confirm");
  assert.equal(conf.confirmations.length, 2);
  assert.equal(model.stages[1].status, "done");
});

test("renderDeliverablesHtml escapes XSS and includes stages", () => {
  const model = buildDeliverablesModel(
    {
      projectPath: "/tmp/x",
      modules: [
        {
          id: "m",
          title: "<script>",
          status: "confirmed",
          card: {
            goal: "<img onerror=alert(1)>",
            outOfScope: "",
            acceptance: "ok",
            assumptions: "",
          },
        },
      ],
    },
    { lang: "en", projectTitle: "Demo" },
  );
  const html = renderDeliverablesHtml(model);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /class="shell"|class="main"/);
  assert.match(html, /Deliverables dossier|hero-project/);
  assert.match(html, /Requirements/);
  assert.match(html, /class="toc"|目录|Contents/);
  assert.match(html, /card-dl|struct-ol|struct-list|chip-list|mod-card|task-table|confirm-table/);
  assert.match(html, /--paper:\s*#ffffff/);
  assert.doesNotMatch(html, /fonts\.googleapis|Cormorant Garamond|DM Sans/);
  assert.doesNotMatch(html, /--register:\s*#e05a2b|--steel:\s*#0f1820/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Version timeline|Initial/);
});

test("structuredBody splits inline numbered acceptance and chips", async () => {
  const { structuredBody, splitContentItems } = await import(
    "../bin/live-deliverables.mjs"
  );
  const items = splitContentItems(
    "1) 打开登录页；2) 输入账号并保存；3) 列表显示成功状态",
  );
  assert.equal(items.length, 3);
  const html = structuredBody(
    "1) 打开登录页；2) 输入账号并保存；3) 列表显示成功状态",
    { as: "list" },
  );
  assert.match(html, /struct-ol/);
  assert.match(html, /<li>打开登录页<\/li>/);
  const chips = structuredBody("收样登记、审核复核、报告签发、财务计费", {
    as: "chips",
  });
  assert.match(chips, /chip-list/);
  assert.match(chips, /收样登记/);
  const flow = structuredBody("浏览器 → 报告服务 → PDF 生成器 → 文件存储");
  assert.match(flow, /flow-steps|flow-node/);
  const goalProse = structuredBody(
    "覆盖收样登记、审核复核、报告签发与财务计费全链路，并支持按样品追溯",
    { as: "prose" },
  );
  assert.match(goalProse, /struct-p/);
  assert.equal((goalProse.match(/struct-p/g) || []).length, 1);
  assert.doesNotMatch(goalProse, /chip-list/);
});

test("task pool and confirmation registry render structured", () => {
  const model = buildDeliverablesModel(
    {
      projectPath: "/tmp/lab",
      modules: [
        {
          id: "main",
          title: "录入",
          status: "confirmed",
          card: {
            goal: "录入结果",
            outOfScope: "收样、审核、签发、导出",
            acceptance:
              "1) 打开样品；2) 保存结果值；3) 判定显示合格",
            assumptions: "样品已登记",
          },
        },
      ],
      taskPool: {
        tasks: [
          {
            id: "T001",
            moduleId: "main",
            title: "Implement module",
            dependsOn: [],
          },
          {
            id: "T002",
            moduleId: "main",
            title: "Verify",
            dependsOn: ["T001"],
          },
        ],
      },
      workerCount: 2,
      architecture: {
        url: "/api/architecture/x.html",
        summary: "浏览器 → API → 数据库",
        confirmed: true,
      },
    },
    { lang: "zh" },
  );
  const html = renderDeliverablesHtml(model);
  assert.match(html, /struct-ol/);
  assert.match(html, /chip-list|chip/);
  assert.match(html, /task-table/);
  assert.match(html, /T001/);
  assert.match(html, /confirm-table/);
  assert.match(html, /mod-card/);
  assert.match(html, /flow-steps|flow-node/);
});

test("writeDeliverablesHtmlFile writes beside project chat key", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-deliv-"));
  const liveRoot = path.join(home, "live");
  const file = writeDeliverablesHtmlFile(
    liveRoot,
    "/Users/demo/my-app",
    "<html>ok</html>",
  );
  assert.ok(file);
  assert.ok(fs.existsSync(file));
  assert.match(file, /-deliverables\.html$/);
  assert.equal(fs.readFileSync(file, "utf8"), "<html>ok</html>");
  fs.rmSync(home, { recursive: true, force: true });
});
