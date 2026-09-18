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
  splitModuleSections,
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

test("splitModuleSections reads [module] markers", () => {
  const sections = splitModuleSections(
    "[录入] 做录入\n[审核] 做审核\n[报告] 出报告",
  );
  assert.equal(sections.length, 3);
  assert.equal(sections[0].title, "录入");
  assert.equal(sections[1].body, "做审核");
});

test("structuredHtml renders modular acceptance as titled numbered lists", () => {
  const text = [
    "[检测结果录入与自动判定] 1) 打开录入页；2) 保存后状态更新；3) 缺必填有提示",
    "[样品接收登记] 1) 打开登记页；2) 生成唯一编号；3) 列表可见",
  ].join("\n");
  const html = structuredHtml(text, "…");
  assert.match(html, /req-mod/);
  assert.match(html, /req-mod-title/);
  assert.match(html, /检测结果录入与自动判定/);
  assert.match(html, /样品接收登记/);
  assert.match(html, /req-list-num/);
  assert.equal((html.match(/req-item/g) || []).length, 6);
});

test("structuredHtml keeps goal prose under module titles", () => {
  const text = [
    "[检测结果录入与自动判定] 在检测结果录入页完成结果值、单位的录入，并自动判定。",
    "[样品接收登记] 登记样品信息并生成样品号。",
  ].join("\n");
  const html = structuredHtml(text, "…");
  assert.match(html, /req-mod-title/);
  assert.match(html, /req-para/);
  assert.doesNotMatch(html, /req-list-num/);
});

test("structuredHtml turns顿号 out-of-scope into bullets", () => {
  const html = structuredHtml(
    "收样登记、审核复核、报告签发、财务计费",
    "…",
  );
  assert.match(html, /req-list/);
  assert.equal((html.match(/req-item/g) || []).length, 4);
});

test("modular edit round-trip keeps [module] lines", () => {
  const text = "[录入] 做录入\n[审核] 做审核";
  const model = reqEditModel(text);
  assert.equal(model.mode, "ul");
  assert.equal(model.items.length, 2);
  const out = serializeReqEdit(model.mode, model.items);
  assert.match(out, /\[录入\]/);
  assert.match(out, /\[审核\]/);
  assert.match(structuredHtml(out, "…"), /req-mod/);
});
