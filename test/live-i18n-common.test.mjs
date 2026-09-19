/**
 * Common live-desk locales beyond zh-CN / en / ja: key parity with English.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const NEW_LOCALES = [
  { code: "ko", file: "i18n-ko.js", exportName: "ko", option: "한국어" },
  { code: "zh-TW", file: "i18n-zh-TW.js", exportName: "zhTW", option: "繁體中文" },
  { code: "es", file: "i18n-es.js", exportName: "es", option: "Español" },
  { code: "pt-BR", file: "i18n-pt-BR.js", exportName: "ptBR", option: "Português" },
  { code: "fr", file: "i18n-fr.js", exportName: "fr", option: "Français" },
  { code: "de", file: "i18n-de.js", exportName: "de", option: "Deutsch" },
  { code: "ru", file: "i18n-ru.js", exportName: "ru", option: "Русский" },
  { code: "vi", file: "i18n-vi.js", exportName: "vi", option: "Tiếng Việt" },
];

async function loadEn() {
  const src = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  const enStart = src.indexOf("const en = {");
  const enEnd = src.indexOf("\n};\n\nconst catalogs", enStart);
  const enMod = src.slice(enStart, enEnd + 2).replace("const en =", "export default");
  const tmp = path.join(ROOT, "test/.tmp-en-only-common.mjs");
  fs.writeFileSync(tmp, enMod + "\n");
  try {
    return (await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)).default;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

test("LOCALES lists common languages and index.html options match", () => {
  const src = fs.readFileSync(path.join(ROOT, "web/live-dev/i18n.js"), "utf8");
  const html = fs.readFileSync(path.join(ROOT, "web/live-dev/index.html"), "utf8");
  for (const loc of NEW_LOCALES) {
    assert.match(src, new RegExp(`LOCALES\\s*=\\s*\\[[^\\]]*\"${loc.code.replace("-", "\\-")}\"`));
    assert.match(html, new RegExp(`<option value=\"${loc.code}\">${loc.option}</option>`));
  }
});

test("new locale catalogs match English keys", async () => {
  const en = await loadEn();
  const enKeys = Object.keys(en).sort();
  for (const loc of NEW_LOCALES) {
    const mod = await import(
      pathToFileURL(path.join(ROOT, "web/live-dev", loc.file)).href +
        `?t=${Date.now()}`
    );
    const table = mod[loc.exportName];
    assert.ok(table, `${loc.file} missing export ${loc.exportName}`);
    const keys = Object.keys(table).sort();
    assert.equal(keys.length, enKeys.length, `${loc.code} key count`);
    assert.deepEqual(keys, enKeys, `${loc.code} key set`);
    assert.ok(String(table["lang.label"] || "").length > 0);
    assert.ok(String(table["chat.send"] || "").length > 0);
  }
});
