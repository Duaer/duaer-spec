/**
 * Preview resolution: pages + local service URLs.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inferLocalServiceUrl,
  parseLocalPreviewPort,
  pickStartCommand,
  resolvePreviewPayload,
} from "../bin/live-preview.mjs";
import { fileURLToPath } from "node:url";

test("inferLocalServiceUrl reads localhost from README", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-prev-"));
  fs.writeFileSync(
    path.join(root, "README.md"),
    "# api\n\nRun `npm start` → http://localhost:8788/healthz\n",
    "utf8",
  );
  assert.equal(inferLocalServiceUrl(root), "http://localhost:8788/healthz");
  fs.rmSync(root, { recursive: true, force: true });
});

test("inferLocalServiceUrl falls back to package.json PORT / default", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-prev-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      scripts: { start: "PORT=8899 node server.mjs" },
    }),
    "utf8",
  );
  assert.equal(inferLocalServiceUrl(root), "http://localhost:8899");
  fs.rmSync(root, { recursive: true, force: true });
});

test("resolvePreviewPayload prefers delivery http URL", () => {
  const got = resolvePreviewPayload({
    delivery: { preview: { url: "http://localhost:9000", label: "API" } },
    worktreePath: "/tmp",
    jobId: "job-1",
  });
  assert.equal(got.url, "http://localhost:9000");
  assert.equal(got.kind, "external");
  assert.equal(got.source, "delivery");
});

test("resolvePreviewPayload auto-service when no page", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-prev-"));
  fs.writeFileSync(
    path.join(root, "README.md"),
    "Start at http://localhost:8788\n",
    "utf8",
  );
  const got = resolvePreviewPayload({
    delivery: { status: "accepted" },
    worktreePath: root,
    jobId: "job-svc",
  });
  assert.equal(got.url, "http://localhost:8788");
  assert.equal(got.source, "auto-service");
  assert.equal(got.kind, "external");
  fs.rmSync(root, { recursive: true, force: true });
});

test("resolvePreviewPayload serves index.html artifact", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-prev-"));
  fs.writeFileSync(path.join(root, "index.html"), "<h1>hi</h1>\n", "utf8");
  const got = resolvePreviewPayload({
    delivery: { status: "accepted" },
    worktreePath: root,
    jobId: "job-html",
  });
  assert.match(got.url, /\/api\/artifact\/job-html\/index\.html$/);
  assert.equal(got.kind, "artifact");
  fs.rmSync(root, { recursive: true, force: true });
});

test("live prompts require starting the service before accept", () => {
  const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  const progress = fs.readFileSync(
    path.join(ROOT, "bin/live-progress.mjs"),
    "utf8",
  );
  assert.match(live, /必须在 delivery\.json 写入 preview\.url/);
  assert.match(live, /必须先把服务跑起来|npm start/);
  assert.match(live, /\/api\/preview\/ensure/);
  assert.match(progress, /启动可打开的服务/);
  assert.doesNotMatch(
    progress,
    /若交付物是页面\/静态文件，在 delivery\.json 增加/,
  );
});

test("parseLocalPreviewPort and pickStartCommand", () => {
  assert.equal(parseLocalPreviewPort("http://localhost:8788/"), 8788);
  assert.equal(parseLocalPreviewPort("https://example.com"), null);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-prev-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ scripts: { start: "node server.mjs" } }),
    "utf8",
  );
  assert.deepEqual(pickStartCommand(root), {
    cmd: "npm",
    args: ["start"],
    script: "start",
  });
  fs.rmSync(root, { recursive: true, force: true });
});
