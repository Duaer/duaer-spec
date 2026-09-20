import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateVerifyGate,
  parseVerifyContract,
  resolveVerifyContract,
  verifyNudgePrompt,
} from "../bin/live-verify-gate.mjs";

test("parseVerifyContract accepts commands and docs-only waiver", () => {
  assert.equal(parseVerifyContract({ commands: ["npm test"] }).kind, "commands");
  assert.equal(parseVerifyContract({ waiver: "docs-only" }).kind, "waiver");
  assert.equal(parseVerifyContract({}).kind, "missing");
  assert.equal(parseVerifyContract({ waiver: "skip" }).kind, "invalid");
  assert.equal(
    parseVerifyContract({ commands: ["npm test"], waiver: "docs-only" }).kind,
    "commands",
  );
});

test("frozen command list ignores a later waiver", () => {
  const resolved = resolveVerifyContract(
    { kind: "waiver", waiver: "docs-only" },
    { commands: ["npm test"], timeoutSec: 30 },
  );
  assert.equal(resolved.kind, "commands");
  assert.deepEqual(resolved.commands, ["npm test"]);
});

test("failing command reopens accepted and keeps exit code", () => {
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "accepted", acceptedAt: "t0" },
    allTasksDone: true,
    deliveryAccepted: true,
    readContract: () => ({
      kind: "commands",
      commands: ["npm test"],
      timeoutSec: 30,
    }),
    runCommands: () => [
      { command: "npm test", exitCode: 1, tail: "fail" },
    ],
  });
  assert.equal(out.action, "write");
  assert.equal(out.delivery.status, "open");
  assert.equal(out.delivery.acceptedAt, undefined);
  assert.equal(out.delivery.verification.result, "fail");
  assert.equal(out.delivery.verification.commands[0].exitCode, 1);
  assert.equal(out.delivery.verification.commands[0].command, "npm test");
  assert.equal(out.nudge.result, "fail");
  assert.match(verifyNudgePrompt({ nudge: out.nudge, worktreePath: "/repo" }), /不要 stamp accepted/);
  assert.doesNotMatch(
    verifyNudgePrompt({ nudge: out.nudge, worktreePath: "/repo" }),
    /立刻完成验收收尾/,
  );
});

test("passing command keeps accepted and records exit 0", () => {
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "accepted" },
    allTasksDone: true,
    deliveryAccepted: true,
    readContract: () => ({
      kind: "commands",
      commands: ["npm test"],
      timeoutSec: 30,
    }),
    runCommands: () => [{ command: "npm test", exitCode: 0, tail: "ok" }],
  });
  assert.equal(out.delivery.status, "accepted");
  assert.equal(out.delivery.verification.commands[0].exitCode, 0);
  assert.equal(out.nudge, null);
  assert.deepEqual(out.frozen.commands, ["npm test"]);
});

test("missing contract reopens accepted", () => {
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "accepted" },
    deliveryAccepted: true,
    readContract: () => ({ kind: "missing" }),
    runCommands: () => {
      throw new Error("should not run");
    },
  });
  assert.equal(out.delivery.status, "open");
  assert.equal(out.delivery.verification.result, "missing");
  assert.equal(out.verifyGate.result, "missing");
});

test("docs-only waiver passes without commands", () => {
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "accepted" },
    deliveryAccepted: true,
    readContract: () => ({ kind: "waiver", waiver: "docs-only" }),
    runCommands: () => {
      throw new Error("should not run");
    },
  });
  assert.equal(out.delivery.status, "accepted");
  assert.equal(out.delivery.verification.result, "pass");
  assert.equal(out.delivery.verification.waiver, "docs-only");
});

test("does not run before tasks are done unless already accepted", () => {
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "open" },
    allTasksDone: false,
    deliveryAccepted: false,
    readContract: () => ({
      kind: "commands",
      commands: ["npm test"],
      timeoutSec: 30,
    }),
    runCommands: () => {
      throw new Error("should not run");
    },
  });
  assert.equal(out.action, "skip");
});

test("failed run is not repeated inside the retry window", () => {
  const previous = {
    result: "fail",
    contractKey: "cmd:npm test",
    ranAt: new Date().toISOString(),
    command: "npm test",
    exitCode: 1,
    commands: [{ command: "npm test", exitCode: 1, tail: "x" }],
  };
  const out = evaluateVerifyGate({
    repoRoot: "/repo",
    delivery: { status: "open" },
    allTasksDone: true,
    deliveryAccepted: false,
    terminalBusy: false,
    previous,
    readContract: () => ({
      kind: "commands",
      commands: ["npm test"],
      timeoutSec: 30,
    }),
    runCommands: () => {
      throw new Error("should not run");
    },
  });
  assert.equal(out.action, "skip");
});
