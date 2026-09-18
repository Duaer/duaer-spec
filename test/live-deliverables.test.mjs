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
  assert.match(html, /Deliverables dossier|hero-project/);
  assert.match(html, /Requirements/);
  assert.match(html, /class="toc"|目录|Contents/);
  assert.match(html, /card-dl|struct-p|struct-list/);
  assert.match(html, /--paper:\s*#ffffff/);
  assert.doesNotMatch(html, /fonts\.googleapis|Cormorant Garamond|DM Sans/);
  assert.doesNotMatch(html, /--register:\s*#e05a2b|--steel:\s*#0f1820/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Version timeline|Initial/);
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
