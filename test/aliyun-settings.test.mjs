import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("aliyun settings: UI + live config markers", () => {
  const app = fs.readFileSync(path.join(root, "web/live-dev/app.js"), "utf8");
  assert.match(app, /hasAliyunCredentials/);
  assert.match(app, /visibleDeployTargetIds/);
  assert.match(app, /visibleDeployHostIds/);
  assert.match(app, /saveAliyunCredentials/);
  assert.match(app, /id === "aliyun"/);

  const html = fs.readFileSync(
    path.join(root, "web/live-dev/index.html"),
    "utf8",
  );
  assert.match(html, /id="cfgAliyunId"/);
  assert.match(html, /id="cfgAliyunSecret"/);
  assert.match(html, /id="saveAliyunCfg"/);
  assert.match(html, /id="clearAliyunCfg"/);
  assert.match(html, /setupAliyun/);

  const live = fs.readFileSync(path.join(root, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function hasAliyunCredentials/);
  assert.match(live, /aliyunAccessKeyId/);
  assert.match(live, /aliyunAccessKeySecret/);
  assert.match(live, /clearAliyunCredentials/);
  assert.match(live, /ALIBABA_CLOUD_ACCESS_KEY_ID/);
  assert.match(live, /withShellEnvExports/);
  assert.match(live, /未配置阿里云 AccessKey/);

  const i18n = fs.readFileSync(path.join(root, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /setup\.aliyunTitle/);
  assert.match(i18n, /setup\.aliyunSave/);
});
