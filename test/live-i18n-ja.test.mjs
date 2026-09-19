/**
 * Japanese live-desk locale: catalog parity + wiring markers.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildDeliverablesModel,
  renderDeliverablesHtml,
} from "../bin/live-deliverables.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("LOCALES includes ja and catalogs match en keys", async () => {
  const i18nPath = path.join(ROOT, "web/live-dev/i18n.js");
  const src = fs.readFileSync(i18nPath, "utf8");
  assert.match(src, /LOCALES\s*=\s*\[[^\]]*\"ja\"/);
  assert.match(src, /from\s+[\"']\.\/i18n-ja\.js[\"']/);
  assert.match(src, /nav\.startsWith\([\"']ja[\"']\)/);

  const { ja } = await import(
    pathToFileURL(path.join(ROOT, "web/live-dev/i18n-ja.js")).href
  );
  // Evaluate en object the same way as the generator
  const enStart = src.indexOf("const en = {");
  const enEnd = src.indexOf("\n};\n\nconst catalogs", enStart);
  const enMod = src.slice(enStart, enEnd + 2).replace("const en =", "export default");
  const tmp = path.join(ROOT, "test/.tmp-en-only.mjs");
  fs.writeFileSync(tmp, enMod + "\n");
  try {
    const en = (await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)).default;
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();
    assert.equal(jaKeys.length, enKeys.length);
    assert.deepEqual(jaKeys, enKeys);
    assert.equal(ja["lang.label"], "言語");
    assert.match(ja["chat.send"], /送信/);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
});

test("index.html language select offers 日本語", () => {
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  assert.match(html, /<option value="ja">日本語<\/option>/);
});

test("deliverables model and HTML accept lang=ja", () => {
  const model = buildDeliverablesModel(
    {
      modules: [
        {
          id: "m1",
          title: "Auth",
          status: "confirmed",
          card: { goal: "login", acceptance: "ok", outOfScope: "", assumptions: "" },
        },
      ],
      architecture: { confirmed: true, url: "/api/architecture/x.html" },
    },
    { lang: "ja", projectTitle: "demo" },
  );
  assert.equal(model.lang, "ja");
  assert.match(model.stages[0].title, /要件/);
  const html = renderDeliverablesHtml(model);
  assert.match(html, /lang="ja"/);
  assert.match(html, /成果物/);
});
