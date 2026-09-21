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
  injectDuaerEmbedFitCss,
  injectDuaerEmbedNodeZoom,
  injectDuaerEmbedPassportExpand,
  injectDuaerEmbedPatches,
  injectDuaerPresentNoZoom,
  layoutArchitectureIr,
  renderArchitectureHtml,
  routeCrossingEdges,
  sanitizeArchitectureIr,
  DUAER_EMBED_FIT_STYLE_ID,
  DUAER_EMBED_ZOOM_SCRIPT_ID,
  DUAER_EMBED_EXPAND_SCRIPT_ID,
  DUAER_PRESENT_NO_ZOOM_SCRIPT_ID,
  DUAER_ARCH_EMBED_MESSAGE_SOURCE,
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

test("routeCrossingEdges detours same-row reverse edge through nodes", () => {
  const ir = layoutArchitectureIr({
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "个人介绍PPT生成架构", quality_profile: "standard" },
    components: [
      {
        id: "user",
        type: "external",
        label: "本人",
        size: [140, 64],
        pos: [928, 96],
      },
      {
        id: "tpl",
        type: "database",
        label: "本地模板",
        size: [140, 64],
        pos: [48, 96],
      },
      {
        id: "ui",
        type: "frontend",
        label: "内容录入",
        size: [140, 64],
        pos: [1148, 96],
      },
      {
        id: "state",
        type: "database",
        label: "页结构状态",
        size: [140, 64],
        pos: [1368, 96],
      },
      {
        id: "gen",
        type: "backend",
        label: "文稿生成",
        size: [140, 64],
        pos: [268, 96],
      },
      {
        id: "check",
        type: "backend",
        label: "试讲校验",
        size: [140, 64],
        pos: [488, 96],
      },
      {
        id: "doc",
        type: "external",
        label: "在线文稿",
        size: [140, 64],
        pos: [708, 96],
      },
    ],
    connections: [
      { id: "c1", from: "user", to: "ui", label: "录入", variant: "emphasis" },
      { id: "c2", from: "tpl", to: "gen", label: "套用" },
      { id: "c3", from: "ui", to: "state", label: "写入" },
      { id: "c4", from: "state", to: "gen", label: "读取" },
      { id: "c5", from: "gen", to: "check", label: "校验" },
      { id: "c6", from: "check", to: "doc", label: "产出" },
      { id: "c7", from: "doc", to: "user", label: "试讲" },
    ],
    boundaries: [],
    cards: [],
  });
  const c4 = ir.connections.find((c) => c.id === "c4");
  assert.ok(c4);
  assert.equal(c4.fromSide, "bottom");
  assert.equal(c4.toSide, "bottom");
  assert.ok(Array.isArray(c4.via) && c4.via.length >= 2);
  const neighbor = ir.connections.find((c) => c.id === "c5");
  assert.ok(!neighbor.via);

  routeCrossingEdges(ir);
  assert.equal(ir.connections.find((c) => c.id === "c4").via.length, 2);
});

test("renderArchitectureHtml accepts PPT IR with long reverse edge", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-arch-ppt-"));
  const out = renderArchitectureHtml(root, {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "个人介绍PPT生成架构", quality_profile: "standard" },
    components: [
      {
        id: "user",
        type: "external",
        label: "本人",
        size: [140, 64],
        pos: [928, 96],
      },
      {
        id: "tpl",
        type: "database",
        label: "本地模板",
        size: [140, 64],
        pos: [48, 96],
      },
      {
        id: "ui",
        type: "frontend",
        label: "内容录入",
        size: [140, 64],
        pos: [1148, 96],
      },
      {
        id: "state",
        type: "database",
        label: "页结构状态",
        size: [140, 64],
        pos: [1368, 96],
      },
      {
        id: "gen",
        type: "backend",
        label: "文稿生成",
        size: [140, 64],
        pos: [268, 96],
      },
      {
        id: "check",
        type: "backend",
        label: "试讲校验",
        size: [140, 64],
        pos: [488, 96],
      },
      {
        id: "doc",
        type: "external",
        label: "在线文稿",
        size: [140, 64],
        pos: [708, 96],
      },
    ],
    connections: [
      { id: "c1", from: "user", to: "ui", label: "录入", variant: "emphasis" },
      { id: "c2", from: "tpl", to: "gen", label: "套用" },
      { id: "c3", from: "ui", to: "state", label: "写入" },
      { id: "c4", from: "state", to: "gen", label: "读取" },
      { id: "c5", from: "gen", to: "check", label: "校验" },
      { id: "c6", from: "check", to: "doc", label: "产出" },
      { id: "c7", from: "doc", to: "user", label: "试讲" },
    ],
    boundaries: [],
    cards: [{ dot: "cyan", title: "主路径", items: ["录入", "生成", "校验"] }],
  });
  assert.ok(fs.existsSync(out.htmlPath));
  assert.ok(out.ir.connections.find((c) => c.id === "c4")?.via?.length >= 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test("layoutArchitectureIr finishes on cyclic connections", () => {
  const t0 = Date.now();
  const ir = layoutArchitectureIr({
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "cycle" },
    components: [
      { id: "a", type: "backend", label: "A" },
      { id: "b", type: "backend", label: "B" },
      { id: "c", type: "database", label: "C" },
    ],
    connections: [
      { id: "c1", from: "a", to: "b" },
      { id: "c2", from: "b", to: "a" },
      { id: "c3", from: "b", to: "c" },
      { id: "c4", from: "c", to: "b" },
    ],
  });
  assert.ok(Date.now() - t0 < 500, "cycle layout must not hang");
  assert.equal(ir.components.length, 3);
  assert.ok(Array.isArray(ir.meta.viewBox));
});

test("sanitizeArchitectureIr drops unpinned component sources", () => {
  const dirty = {
    diagram_type: "architecture",
    meta: { title: "Tasks", repository: { url: "not-a-pin" } },
    components: [
      {
        id: "T001",
        type: "external",
        label: "T001",
        sources: [{ path: "run/waiting", label: "等待中" }],
      },
    ],
    connections: [],
  };
  for (const clean of [sanitizeArchitectureIr(dirty), sanitizeBrowser(dirty)]) {
    assert.equal(clean.meta.repository, undefined);
    assert.equal(clean.components[0].sources, undefined);
  }
  const pinned = sanitizeArchitectureIr({
    ...dirty,
    meta: {
      title: "Tasks",
      repository: {
        url: "https://github.com/example/repo",
        revision: "a".repeat(40),
      },
    },
  });
  assert.ok(pinned.meta.repository);
  assert.equal(pinned.components[0].sources.length, 1);
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

test("repairGeometry fits long CJK sublabels and edge labels for Archify", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "duaer-arch-repair-"));
  const out = renderArchitectureHtml(root, {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: "Ban", quality_profile: "standard" },
    components: [
      {
        id: "ops",
        type: "external",
        label: "运营",
        pos: [48, 80],
        size: [130, 60],
      },
      {
        id: "accountsvc",
        type: "backend",
        label: "账号服务",
        pos: [448, 80],
        size: [130, 60],
      },
      {
        id: "banstore",
        type: "database",
        label: "封禁存储",
        sublabel: "用户ID / 封禁标记 / 时间 / 操作人 / 原因",
        pos: [648, 80],
        size: [130, 60],
      },
      {
        id: "login",
        type: "backend",
        label: "登录校验",
        pos: [848, 80],
        size: [130, 60],
      },
    ],
    connections: [
      {
        id: "c1",
        from: "accountsvc",
        to: "banstore",
        label: "写入/更新封禁状态",
        variant: "emphasis",
      },
      { id: "c2", from: "ops", to: "accountsvc", label: "封禁/解封" },
      { id: "c3", from: "login", to: "banstore", label: "读状态" },
    ],
    cards: [{ dot: "cyan", title: "Path", items: ["ops → account → store"] }],
  });
  assert.ok(fs.existsSync(out.htmlPath));
  assert.ok(out.ir.components.find((c) => c.id === "banstore").size[0] >= 130);
  const edge = out.ir.connections.find((c) => c.id === "c1");
  assert.equal(edge.labelDy, -28);
  assert.ok(String(edge.label).length <= 20);
  fs.rmSync(root, { recursive: true, force: true });
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
  const html = fs.readFileSync(out.htmlPath, "utf8");
  assert.match(html, new RegExp(`id="${DUAER_EMBED_FIT_STYLE_ID}"`));
  assert.match(html, new RegExp(`id="${DUAER_EMBED_ZOOM_SCRIPT_ID}"`));
  assert.match(html, new RegExp(`id="${DUAER_EMBED_EXPAND_SCRIPT_ID}"`));
  assert.match(html, /\.diagram-container\s*\{[^}]*max-height:\s*none/s);
  assert.match(html, /__duaerEmbedZoom|includeNeighbors:\s*false/);
  assert.match(html, new RegExp(DUAER_ARCH_EMBED_MESSAGE_SOURCE));
  fs.rmSync(root, { recursive: true, force: true });
});

test("injectDuaerEmbedFitCss lifts diagram-container height clip for embed", () => {
  const raw = `<!doctype html><html><head></head><body><div class="diagram-container"></div></body></html>`;
  const once = injectDuaerEmbedFitCss(raw);
  assert.match(once, new RegExp(`id="${DUAER_EMBED_FIT_STYLE_ID}"`));
  assert.match(once, /html\[data-embed="true"\] \.diagram-container/);
  assert.match(once, /max-height:\s*none\s*!important/);
  assert.match(once, /overflow:\s*visible\s*!important/);
  assert.match(once, /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*display:\s*block\s*!important/s);
  assert.match(
    once,
    /html\[data-embed="true"\] \.diagram-container\s*\{[^}]*padding-top:\s*100px\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.diagram-container\s*\{[^}]*padding-left:\s*100px\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*left:\s*0\.75rem\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*top:\s*0\.75rem\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*z-index:\s*10000\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*overflow:\s*visible\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip \.relationship-lens-list\s*\{[^}]*max-height:\s*none\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip \.relationship-lens-list\s*\{[^}]*overflow:\s*visible\s*!important/s,
  );
  assert.match(
    once,
    /html\[data-embed="true"\] \.focus-chip\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s,
  );
  const twice = injectDuaerEmbedFitCss(once);
  assert.equal(
    twice.split(`id="${DUAER_EMBED_FIT_STYLE_ID}"`).length - 1,
    1,
  );
  // Upgrade path: old fit block without passport is replaced in place.
  const stale = once.replace(
    /\/\* Archify embed mode hides[\s\S]*?\.focus-chip\[hidden\][\s\S]*?\}/,
    "",
  );
  assert.doesNotMatch(stale, /\.focus-chip\s*\{[^}]*display:\s*block/s);
  const upgraded = injectDuaerEmbedFitCss(stale);
  assert.match(
    upgraded,
    /html\[data-embed="true"\] \.focus-chip\s*\{[^}]*display:\s*block\s*!important/s,
  );
  assert.equal(
    upgraded.split(`id="${DUAER_EMBED_FIT_STYLE_ID}"`).length - 1,
    1,
  );
});

test("injectDuaerEmbedNodeZoom forces single-node reveal in embed", () => {
  const raw = `<!doctype html><html data-embed="true"><head></head><body></body></html>`;
  const once = injectDuaerEmbedNodeZoom(raw);
  assert.match(once, new RegExp(`id="${DUAER_EMBED_ZOOM_SCRIPT_ID}"`));
  assert.match(once, /includeNeighbors:\s*false/);
  assert.match(once, /innerWidth/);
  const patched = injectDuaerEmbedPatches(raw);
  assert.match(patched, new RegExp(`id="${DUAER_EMBED_FIT_STYLE_ID}"`));
  assert.match(patched, new RegExp(`id="${DUAER_EMBED_ZOOM_SCRIPT_ID}"`));
  assert.match(patched, new RegExp(`id="${DUAER_EMBED_EXPAND_SCRIPT_ID}"`));
  assert.match(patched, new RegExp(DUAER_ARCH_EMBED_MESSAGE_SOURCE));
  assert.equal(
    injectDuaerEmbedPatches(patched).split(`id="${DUAER_EMBED_ZOOM_SCRIPT_ID}"`)
      .length - 1,
    1,
  );
  const expandOnce = injectDuaerEmbedPassportExpand(raw);
  const expandTwice = injectDuaerEmbedPassportExpand(expandOnce);
  assert.equal(
    expandTwice.split(`id="${DUAER_EMBED_EXPAND_SCRIPT_ID}"`).length - 1,
    1,
  );
  assert.match(expandOnce, /getBoundingClientRect/);
  assert.match(expandOnce, /diagram-container/);
});

test("injectDuaerPresentNoZoom clamps reveal scale for dispatch present", () => {
  const raw = `<!doctype html><html><head></head><body></body></html>`;
  const once = injectDuaerPresentNoZoom(raw);
  assert.match(once, new RegExp(`id="${DUAER_PRESENT_NO_ZOOM_SCRIPT_ID}"`));
  assert.match(once, /maxScale:\s*1/);
  assert.match(once, /__duaerPresentNoZoom/);
  assert.equal(
    injectDuaerPresentNoZoom(once).split(`id="${DUAER_PRESENT_NO_ZOOM_SCRIPT_ID}"`)
      .length - 1,
    1,
  );
});

test("live sources wire architecture API + desk panel", () => {
  const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /\/api\/architecture\/render/);
  assert.match(live, /ARCHITECTURE_CHAT_PROMPT/);
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /architecturePanel|architectureFrame/);
  assert.match(html, /architecture-mount/);
  assert.doesNotMatch(html, /<iframe[^>]*id="architecture/i);
  const js = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(js, /beginArchitectureDesign|confirmArchitecture|kickoffArchitectureDialogue/);
  assert.match(js, /architectureContinueOptions|arch\.nudgeContinue|afterChatBubbleUi/);
  assert.match(js, /mountArchitectureDiagram|bindArchitectureMount|architecture-mount\.mjs/);
  assert.match(js, /ARCH_EMBED_GUTTER_TOP|ARCH_EMBED_GUTTER_LEFT/);
  assert.match(js, /hydrateArchitectureMounts|clearArchitectureMount/);
  assert.match(js, /announceArchitectureRendered|arch\.renderedReady/);
  assert.match(
    js,
    /function setBusy[\s\S]*architectureConfirm[\s\S]*syncArchitecturePanel/,
  );
  assert.doesNotMatch(js, /可渲染的架构 JSON/);
  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /arch\.renderedReady/);
  assert.doesNotMatch(i18n, /可渲染的架构 JSON/);
  assert.doesNotMatch(live, /以下为可渲染的架构 JSON/);
  assert.match(live, /禁止提 JSON|右侧「计划托管」/);
  assert.match(live, /injectDuaerEmbedPatches/);
  assert.match(live, /injectDuaerPresentNoZoom/);
  assert.match(live, /searchParams\.get\("noz"\)/);
  assert.match(live, /\.json\$\/i|architecture\/.*\.json/);
  const mount = fs.readFileSync(
    path.join(ROOT, "web/live-dev/architecture-mount.mjs"),
    "utf8",
  );
  assert.match(mount, /attachShadow|archify-root|runViewerScript|scopeArchifyCss/);
  assert.match(mount, /data-motion-capable|disableEmbedNodeZoom|bodyHtml|btn-preset/);
  assert.match(mount, /__duaerEmbedNoZoom|duaerNoZoomReveal/);
  assert.match(mount, /__duaerStageZoom|duaerStageZoomReveal/);
  assert.match(mount, /maxScale:\s*2\.6/);
  assert.match(mount, /zoom:\s*Boolean\(opts\.stage\)/);
  assert.doesNotMatch(mount, /installDesktopReveal|__duaerEmbedZoom/);
  assert.match(mount, /\.focus-chip\s*\{\s*display:\s*none\s*!important/);
  assert.match(mount, /100vh|100dvh|duaer-arch-host-chrome|height:\s*auto\s*!important/);
  assert.doesNotMatch(mount, /arch-passport/);
});
