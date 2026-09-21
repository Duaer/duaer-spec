import assert from "node:assert/strict";
import test from "node:test";
import {
  baselineFingerprint,
  baselineIsValid,
  clipBaseline,
  emptyBaseline,
} from "../web/live-dev/baseline.mjs";

test("baseline fingerprint stable for confirmed modules", () => {
  const modules = [
    {
      id: "b",
      status: "confirmed",
      card: {
        goal: "g",
        acceptance: "a",
        deviceMatrix: "Chrome",
        criticalPaths: "login",
        exceptionCases: "empty",
      },
    },
    {
      id: "a",
      status: "confirmed",
      card: {
        goal: "g2",
        acceptance: "a2",
        deviceMatrix: "Safari",
        criticalPaths: "pay",
        exceptionCases: "403",
      },
    },
    { id: "draft", status: "draft", card: { goal: "x", acceptance: "y" } },
  ];
  const fp = baselineFingerprint(modules);
  assert.match(fp, /"id":"a"/);
  assert.match(fp, /"id":"b"/);
  assert.doesNotMatch(fp, /draft/);
  const signed = {
    signedAt: "2026-09-21T00:00:00.000Z",
    signer: "Ops",
    fingerprint: fp,
    changes: [],
  };
  assert.equal(baselineIsValid(signed, modules), true);
  assert.equal(baselineIsValid(emptyBaseline(), modules), false);
  assert.equal(
    baselineIsValid({ ...signed, fingerprint: "stale" }, modules),
    false,
  );
});

test("clipBaseline keeps change history", () => {
  const clipped = clipBaseline({
    signedAt: "t",
    signer: "  Alice  ",
    fingerprint: "fp",
    changes: [{ at: "t2", reason: "scope grew", signer: "Bob" }],
  });
  assert.equal(clipped.signer, "Alice");
  assert.equal(clipped.changes.length, 1);
  assert.equal(clipped.changes[0].reason, "scope grew");
});
