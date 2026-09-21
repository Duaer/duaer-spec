/**
 * FDE-02 API contract helpers + task pool injection.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  apiContractDeclaresNoHttp,
  apiContractIsFilled,
  modulesNeedApiContractTasks,
} from "../web/live-dev/api-contract.mjs";
import { buildTaskPoolFromModules, clipCard } from "../bin/live-modules.mjs";
import { baselineFingerprint } from "../web/live-dev/baseline.mjs";

test("apiContract helpers recognize opt-out and paths", () => {
  assert.equal(apiContractIsFilled(""), false);
  assert.equal(apiContractIsFilled("本模块无 HTTP API"), true);
  assert.equal(apiContractDeclaresNoHttp("本模块无 HTTP API"), true);
  assert.equal(apiContractDeclaresNoHttp("openapi/openapi.yaml"), false);
  assert.equal(apiContractIsFilled("openapi/openapi.yaml"), true);
});

test("clipCard keeps apiContract", () => {
  const c = clipCard({ apiContract: "openapi/openapi.yaml" });
  assert.equal(c.apiContract, "openapi/openapi.yaml");
});

test("baseline fingerprint includes apiContract", () => {
  const modules = [
    {
      id: "main",
      status: "confirmed",
      card: {
        goal: "g",
        acceptance: "a",
        apiContract: "openapi/openapi.yaml",
      },
    },
  ];
  assert.match(baselineFingerprint(modules), /openapi\/openapi\.yaml/);
});

test("task pool injects FDE-02 tasks when contract path declared", () => {
  const withApi = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Main",
      status: "confirmed",
      card: {
        goal: "Ship API",
        acceptance: "npm test passes",
        apiContract: "openapi/openapi.yaml",
      },
      dependsOn: [],
    },
  ]);
  const titles = withApi.tasks.map((t) => t.title).join("\n");
  assert.match(titles, /FDE-02: sync API contract/);
  assert.match(titles, /FDE-02: generate\/update Mock/);
  assert.match(titles, /FDE-02: CI provider contract test/);
  assert.equal(
    modulesNeedApiContractTasks([
      {
        status: "confirmed",
        card: { apiContract: "openapi/openapi.yaml" },
      },
    ]),
    true,
  );
});

test("task pool skips FDE-02 tasks for no-HTTP modules", () => {
  const pool = buildTaskPoolFromModules([
    {
      id: "main",
      title: "Main",
      status: "confirmed",
      card: {
        goal: "Static page",
        acceptance: "page opens",
        apiContract: "本模块无 HTTP API",
      },
      dependsOn: [],
    },
  ]);
  const titles = pool.tasks.map((t) => t.title).join("\n");
  assert.doesNotMatch(titles, /FDE-02:/);
});
