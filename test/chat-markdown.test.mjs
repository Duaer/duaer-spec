/**
 * Chat bubble Markdown rendering (safe subset).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { renderChatMarkdown } from "../web/live-dev/chat-markdown.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("renderChatMarkdown bold for **找/筛** style", () => {
  const html = renderChatMarkdown("请点 **找/筛** 继续");
  assert.match(html, /<strong>找\/筛<\/strong>/);
  assert.doesNotMatch(html, /\*\*找/);
});

test("renderChatMarkdown escapes raw HTML", () => {
  const html = renderChatMarkdown('x <script>alert(1)</script> **ok**');
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>ok<\/strong>/);
});

test("renderChatMarkdown inline code and links", () => {
  const html = renderChatMarkdown(
    "Run `npm test` then open [docs](https://example.com/a).",
  );
  assert.match(html, /<code class="chat-inline-code">npm test<\/code>/);
  assert.match(
    html,
    /<a href="https:\/\/example.com\/a"[^>]*>docs<\/a>/,
  );
});

test("renderChatMarkdown auto-links bare http URLs", () => {
  const html = renderChatMarkdown(
    "打开看看：http://localhost:8788/app",
  );
  assert.match(
    html,
    /<a href="http:\/\/localhost:8788\/app"[^>]*>http:\/\/localhost:8788\/app<\/a>/,
  );
});

test("renderChatMarkdown auto-links /api/artifact paths", () => {
  const html = renderChatMarkdown(
    "打开看看：/api/artifact/job1/index.html",
  );
  assert.match(
    html,
    /<a href="\/api\/artifact\/job1\/index\.html"[^>]*>\/api\/artifact\/job1\/index\.html<\/a>/,
  );
});

test("renderChatMarkdown markdown link with /api/ href", () => {
  const html = renderChatMarkdown(
    "[打开看看](/api/artifact/j/index.html)",
  );
  assert.match(
    html,
    /<a href="\/api\/artifact\/j\/index\.html"[^>]*>打开看看<\/a>/,
  );
});

test("accepted preview chat parts keep /api/ paths root-relative", () => {
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /Keep desk-served paths root-relative/);
  assert.match(app, /if \(u\.startsWith\("\/"\)\) return u;/);
  assert.match(app, /openedPreferred/);
});

test("renderChatMarkdown does not nest-break http://…/api/result/… links", () => {
  const url =
    "http://127.0.0.1:8787/api/result/056-pdf/r1/docs/ui/alignment-spec.md";
  const html = renderChatMarkdown(`打开看看：[打开看看](${url})`);
  assert.equal((html.match(/<a\b/g) || []).length, 1);
  assert.ok(html.includes(`href="${url}"`));
  assert.ok(html.includes(">打开看看</a>"));
  assert.doesNotMatch(html, /href="http:\/\/127\.0\.0\.1:8787<a/);
  assert.doesNotMatch(html, /target="_blank"[^<]*target="_blank"/);
});

test("renderChatMarkdown prior label：[url](url) form stays one clean link", () => {
  const url =
    "http://127.0.0.1:8787/api/result/056-pdf/r1/docs/ui/alignment-spec.md";
  // Old i18n shaped text that triggered the garble
  const html = renderChatMarkdown(`打开看看：[${url}](${url})`);
  assert.equal((html.match(/<a\b/g) || []).length, 1);
  assert.ok(html.includes(`href="${url}"`));
  assert.doesNotMatch(html, /href="http:\/\/127\.0\.0\.1:8787<a/);
  assert.doesNotMatch(html, /\/api\/result\/[^"<]*" target="_blank"[^>]*>\/api\/result/);
});

test("renderChatMarkdown bare full result URL stays one link", () => {
  const url =
    "http://127.0.0.1:8787/api/result/056-pdf/r1/docs/ui/alignment-spec.md";
  const html = renderChatMarkdown(`打开看看：${url}`);
  assert.equal((html.match(/<a\b/g) || []).length, 1);
  assert.ok(html.includes(`href="${url}"`));
  assert.doesNotMatch(html, /href="http:\/\/127\.0\.0\.1:8787<a/);
});

test("live sources wire chat markdown into bubbles", () => {
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /renderChatMarkdown/);
  assert.match(app, /acceptedPreviewChatParts|preview\.linkMd/);
  assert.match(app, /bubble-body/);
  assert.doesNotMatch(app, /createTextNode\(text\)/);
  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(css, /\.bubble-body/);
});
