/**
 * Architecture layout + IR extract helpers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  extractArchitectureIr,
  layoutArchitectureIr,
  renderArchitectureHtml,
  sanitizeArchitectureIr,
} from "../bin/live-archify.mjs";
import {
  extractArchitectureIr as extractBrowser,
  sanitizeArchitectureIr as sanitizeBrowser,
} from "../web/live-dev/architecture-ir.mjs";

test("layoutArchitectureIr assigns pos and viewBox", () => {
  const ir = layoutArchitectureIr({
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "T" },
    components: [
      { id: "a", type: "external", label: "A" },
      { id: "b", type: "frontend", label: "B" },
    ],
    connections: [{ id: "c1", from: "a", to: "b" }],
  });
  assert.equal(ir.components[0].pos.length, 2);
  assert.equal(ir.meta.viewBox.length, 2);
  assert.ok(ir.meta.viewBox[0] >= 320);
  assert.ok(ir.meta.viewBox[1] >= 240);
});

test("sanitizeArchitectureIr drops extras in server and browser", () => {
  const dirty = {
    ready: true,
    goal: "x",
    reply: "y",
    diagram_type: "architecture",
    components: [{ id: "a", type: "external", label: "A", foo: 1 }],
    connections: [],
  };
  const a = sanitizeArchitectureIr(dirty);
  const b = sanitizeBrowser(dirty);
  assert.equal(a.goal, undefined);
  assert.equal(b.reply, undefined);
  assert.equal(a.components[0].foo, undefined);
  assert.equal(b.components[0].id, "a");
});

test("extractArchitectureIr finds diagram JSON", () => {
  const text = `ok\n<<<JSON>>>\n{"ready":true,"diagram_type":"architecture","schema_version":1,"meta":{"title":"X"},"components":[{"id":"u","type":"external","label":"U"}],"connections":[]}`;
  const ir = extractArchitectureIr(text);
  assert.equal(ir.diagram_type, "architecture");
  assert.equal(ir.components[0].id, "u");
  assert.equal(extractBrowser(text).components[0].id, "u");
  assert.equal(ir.ready, undefined);
});

test("sanitize strips Brief/chat extras before Archify", () => {
  const contaminated = {
    type: "architecture",
    reply: "here is the diagram",
    goal: "build app",
    outOfScope: "mobile",
    acceptance: "works",
    assumptions: "none",
    ready: true,
    diagram_type: "architecture",
    schema_version: 1,
    meta: { title: "Desk", quality_profile: "standard", extra: "nope" },
    components: [
      { id: "users", type: "external", label: "Users", note: "drop" },
      { id: "app", type: "frontend", label: "App" },
    ],
    connections: [
      {
        id: "c1",
        from: "users",
        to: "app",
        label: "HTTPS",
        variant: "emphasis",
        junk: true,
      },
    ],
    cards: [{ dot: "cyan", title: "Edge", items: ["App"], more: 1 }],
  };
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-arch-dirty-"));
  const out = renderArchitectureHtml(root, contaminated);
  assert.ok(fs.existsSync(out.htmlPath));
  assert.equal(out.ir.goal, undefined);
  assert.equal(out.ir.reply, undefined);
  assert.equal(out.ir.ready, undefined);
  assert.equal(out.ir.meta.extra, undefined);
  assert.equal(out.ir.components[0].note, undefined);
  fs.rmSync(root, { recursive: true, force: true });
});

test("renderArchitectureHtml produces HTML via Archify", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-arch-test-"));
  const out = renderArchitectureHtml(root, {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "Unit" },
    components: [
      { id: "users", type: "external", label: "Users" },
      { id: "app", type: "frontend", label: "App" },
    ],
    connections: [
      { id: "c1", from: "users", to: "app", label: "HTTPS", variant: "emphasis" },
    ],
    cards: [{ dot: "cyan", title: "Edge", items: ["App"] }],
  });
  assert.match(out.urlPath, /\/api\/architecture\//);
  assert.ok(fs.existsSync(out.htmlPath));
  assert.ok(fs.statSync(out.htmlPath).size > 1000);
  fs.rmSync(root, { recursive: true, force: true });
});

test("live sources wire architecture API + desk panel", () => {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /\/api\/architecture\/render/);
  assert.match(live, /ARCHITECTURE_CHAT_PROMPT/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /architecturePanel|architectureFrame/);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /beginArchitectureDesign|confirmArchitecture|kickoffArchitectureDialogue/);
  assert.match(js, /architectureContinueOptions|arch\.nudgeContinue|afterChatBubbleUi/);
  assert.match(js, /architectureEmbedUrl|embed=1/);
});
