/**
 * Clickable chat choice enrichment.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichChatOptions,
  normalizeOptions,
} from "../web/live-dev/choice-options.mjs";

test("normalizeOptions trims labels and caps length", () => {
  const out = normalizeOptions([" 静态页面 ", "1. 带后端", "带后端", ""]);
  assert.deepEqual(out, ["静态页面", "带后端"]);
});

test("enrichChatOptions keeps JSON options when present", () => {
  const out = enrichChatOptions("随便问问\n1. 忽略我", ["静态 HTML", "带后端"]);
  assert.deepEqual(out, ["静态 HTML", "带后端"]);
});

test("enrichChatOptions parses numbered reply lines", () => {
  const reply = "先选一种：\n1. 静态 HTML 文件\n2. 带简单后端\n3. 再说";
  const out = enrichChatOptions(reply, []);
  assert.equal(out.length, 3);
  assert.equal(out[0], "静态 HTML 文件");
  assert.equal(out[1], "带简单后端");
});

test("enrichChatOptions parses quoted 还是 pair", () => {
  const out = enrichChatOptions('要「深色主题」还是「浅色主题」？', []);
  assert.deepEqual(out, ["深色主题", "浅色主题"]);
});
