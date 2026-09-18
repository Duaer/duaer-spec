import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("host deploy credentials: aliyun + cloudflare + aws gates", () => {
  const app = fs.readFileSync(path.join(root, "web/live-dev/app.js"), "utf8");
  assert.match(app, /hasAliyunCredentials/);
  assert.match(app, /hasCloudflareCredentials/);
  assert.match(app, /hasAwsCredentials/);
  assert.match(app, /saveCloudflareCredentials/);
  assert.match(app, /saveAwsCredentials/);
  assert.match(app, /visibleDeployTargetIds/);
  assert.match(app, /visibleDeployHostIds/);

  const html = fs.readFileSync(
    path.join(root, "web/live-dev/index.html"),
    "utf8",
  );
  assert.match(html, /id="cfgAliyunId"/);
  assert.match(html, /id="cfgCfToken"/);
  assert.match(html, /id="cfgCfAccount"/);
  assert.match(html, /id="cfgAwsId"/);
  assert.match(html, /id="cfgAwsSecret"/);
  assert.match(html, /id="saveCfCfg"/);
  assert.match(html, /id="saveAwsCfg"/);

  const live = fs.readFileSync(path.join(root, "bin/duaer-live.mjs"), "utf8");
  assert.match(live, /function hasCloudflareCredentials/);
  assert.match(live, /function hasAwsCredentials/);
  assert.match(live, /CLOUDFLARE_API_TOKEN/);
  assert.match(live, /AWS_ACCESS_KEY_ID/);
  assert.match(live, /assertDeployCredentials/);
  assert.match(live, /deployEnvForTarget/);
  assert.match(live, /clearCloudflareCredentials/);
  assert.match(live, /clearAwsCredentials/);

  const i18n = fs.readFileSync(path.join(root, "web/live-dev/i18n.js"), "utf8");
  assert.match(i18n, /setup\.cloudflareTitle/);
  assert.match(i18n, /setup\.awsTitle/);
});
