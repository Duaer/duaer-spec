#!/usr/bin/env node
/**
 * Build web/live-dev/i18n-es.js from test/.tmp-en-keys.json + embedded Spanish map.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import en from "./.tmp-en-keys.json" with { type: "json" };
import c1 from "./es-chunk1.json" with { type: "json" };
import c2 from "./es-chunk2.json" with { type: "json" };

const esMap = { ...c1, ...c2 };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(ROOT, "web/live-dev/i18n-es.js");

const enKeys = Object.keys(en);
const missing = enKeys.filter((k) => !(k in esMap));
const extra = Object.keys(esMap).filter((k) => !(k in en));
if (missing.length || extra.length) {
  console.error("missing", missing.length, missing.slice(0, 10));
  console.error("extra", extra.length, extra.slice(0, 10));
  process.exit(1);
}

const lines = [
  "/** Spanish (es) catalog for Duaer-spec FDE live desk. */",
  "export const es = {",
];
for (const k of enKeys) {
  lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(esMap[k])},`);
}
lines.push("};", "");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const mod = await import(pathToFileURL(outPath).href + `?t=${Date.now()}`);
const esKeys = Object.keys(mod.es);
const enSet = new Set(enKeys);
const esSet = new Set(esKeys);
let miss = 0;
let ext = 0;
for (const k of enKeys) if (!esSet.has(k)) miss++;
for (const k of esKeys) if (!enSet.has(k)) ext++;
console.log(JSON.stringify({ keys: esKeys.length, missing: miss, extra: ext }));
