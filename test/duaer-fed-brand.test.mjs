/**
 * Duaer-spec FED brand: header/title + marks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Duaer-spec FED brand appears in desk UI and CLI", () => {
  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /"header\.brand":\s*"Duaer-spec FED"/);
  assert.match(i18n, /"doc\.title":\s*"Duaer-spec FED"/);
  assert.match(i18n, /"header\.mark":\s*"Field Engineering Desk"/);
  assert.match(i18n, /"header\.mark":\s*"现场开发"/);

  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /<title>Duaer-spec FED<\/title>/);
  assert.match(html, /header\.brand">Duaer-spec FED</);

  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /Duaer-spec FED {2}http:\/\/127\.0\.0\.1/);
  assert.match(live, /你是「Duaer-spec FED」/);

  const cli = fs.readFileSync(path.join(ROOT, "bin/duaer.mjs"), "utf8");
  assert.match(cli, /Open Duaer-spec FED/);

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.match(readme, /## Duaer-spec FED \(live desk\)/);
  assert.doesNotMatch(readme, /[\u4e00-\u9fff]/);
});
