/**
 * Structured requirements display for the middle confirm card.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeReqText,
  structuredHtml,
  reqEditModel,
  serializeReqEdit,
  parseReqBlocks,
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

test("normalizeReqText splits numbered list joined by Chinese semicolon", () => {
  const out = normalizeReqText(
    "1) 打开登录页；2) 输入账号并保存；3) 列表显示成功状态",
  );
  assert.equal(out.split("\n").filter(Boolean).length, 3);
  assert.match(out, /^1\)/m);
  assert.match(out, /^2\)/m);
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

test("reqEditModel + serializeReqEdit round-trip bullets", () => {
  const model = reqEditModel("- A\n- B");
  assert.equal(model.mode, "ul");
  assert.deepEqual(model.items, ["A", "B"]);
  assert.equal(serializeReqEdit(model.mode, model.items), "- A\n- B");
});

test("reqEditModel treats single paragraph as para", () => {
  const model = reqEditModel("Ship a login page");
  assert.equal(model.mode, "para");
  assert.deepEqual(model.items, ["Ship a login page"]);
  assert.equal(serializeReqEdit("para", model.items), "Ship a login page");
});

test("parseReqBlocks reads numbered lists", () => {
  const blocks = parseReqBlocks("1. One\n2. Two");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "ol");
  assert.deepEqual(blocks[0].items, ["One", "Two"]);
});
