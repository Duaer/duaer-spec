/**
 * Duaer-spec FDE brand: header/title + marks.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Duaer-spec FDE brand appears in desk UI and CLI", () => {
  const i18n = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /"header\.brandProduct":\s*"Duaer-spec"/);
  assert.match(i18n, /"header\.brandFde":\s*"FDE"/);
  assert.match(i18n, /"doc\.title":\s*"Duaer-spec FDE"/);
  assert.match(i18n, /"header\.mark":\s*"Field Development Environment"/);
  assert.match(i18n, /"header\.mark":\s*"现场开发"/);
  assert.match(i18n, /"setup\.hint":\s*"先接好 Duaer 台面模型/);
  assert.match(i18n, /"setup\.hint":\s*"Connect a Duaer desk model first/);
  assert.match(i18n, /"setup\.guideDeskTitle":\s*"Duaer 台面模型/);
  assert.match(i18n, /"setup\.guideDeskTitle":\s*"Duaer desk model/);

  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /<title>Duaer-spec FDE<\/title>/);
  assert.match(html, /header\.brandProduct/);
  assert.match(html, /brand-fde/);
  assert.match(html, /id="chatEmpty"/);

  const live = fs.readFileSync(path.join(ROOT, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /Duaer-spec FDE {2}http:\/\/127\.0\.0\.1/);
  assert.match(live, /你是「Duaer-spec FDE」/);

  const cli = fs.readFileSync(path.join(ROOT, "bin/duaer.mjs"), "utf8");
  assert.match(cli, /Open Duaer-spec FDE/);

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.match(readme, /docs\/assets\/duaer-spec-fde\.svg/);
  assert.match(readme, /## Duaer-spec FDE \(live desk\)/);
  const brandSvg = fs.readFileSync(path.join(ROOT, "docs/assets/duaer-spec-fde.svg"), "utf8");
  assert.match(brandSvg, /#e05a2b/);
  assert.match(brandSvg, />FDE</);
  assert.doesNotMatch(readme, /[\u4e00-\u9fff]/);

  const css = fs.readFileSync(path.join(ROOT, "web/live-dev/styles.css"), "utf8");
  assert.match(css, /\.brand-fde/);
  assert.match(css, /\.chat-empty/);
  assert.match(css, /\.history-drawer[\s\S]*background:\s*var\(--plate\)/);
  assert.match(css, /\.btn\.primary[\s\S]*background:\s*var\(--register\)/);
});
