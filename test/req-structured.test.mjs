/**
 * Structured requirements display for the middle confirm card.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeReqText,
  structuredHtml,
} from "../web/live-dev/structured-html.mjs";

test("normalizeReqText splits semicolon acceptance into bullets", () => {
  const out = normalizeReqText("打开首页看到标题；表单可提交；移动端不换行");
  assert.match(out, /^- /m);
  assert.equal(out.split("\n").length, 3);
});

test("normalizeReqText splits inline Chinese numbered lists", () => {
  const out = normalizeReqText("1、深色主题 2、响应式布局 3、可提交表单");
  assert.match(out, /^1、/m);
  assert.equal(out.split("\n").filter(Boolean).length, 3);
});

test("structuredHtml renders list items with req-item class", () => {
  const html = structuredHtml("- One\n- Two", "…");
  assert.match(html, /req-list/);
  assert.match(html, /req-item/);
  assert.match(html, /<li class="req-item">One<\/li>/);
  assert.match(html, /Two/);
});

test("structuredHtml structures jammed acceptance line", () => {
  const html = structuredHtml(
    "打开 X 看到 Y；命令 npm test 通过；手机宽度下不横向滚动",
    "…",
  );
  assert.match(html, /req-item/);
  assert.equal((html.match(/req-item/g) || []).length, 3);
});

test("structuredHtml keeps empty placeholder", () => {
  assert.match(structuredHtml("", "待确认"), /req-empty/);
  assert.match(structuredHtml("", "待确认"), /待确认/);
});
