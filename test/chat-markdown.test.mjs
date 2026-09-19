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

test("live sources wire chat markdown into bubbles", () => {
  const app = fs.readFileSync(path.join(ROOT, "web/live-dev/app.js"), "utf8");
  assert.match(app, /renderChatMarkdown/);
  assert.match(app, /acceptedPreviewChatParts|preview\.linkMd/);
  assert.match(app, /bubble-body/);
  assert.doesNotMatch(app, /createTextNode\(text\)/);
  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(css, /\.bubble-body/);
});
