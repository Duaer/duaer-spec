/**
 * Project timeline sort + merge (initial / revise / bug).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProjectTimelineVersions,
  sortTimelineEntries,
} from "../bin/live-project-timeline.mjs";

test("sortTimelineEntries orders by at then kind", () => {
  const sorted = sortTimelineEntries([
    { id: "b", kind: "bug", at: "2026-09-20T12:00:00.000Z", revision: 1 },
    { id: "v0", kind: "initial", at: "2026-09-18T10:00:00.000Z", revision: 0 },
    { id: "r1", kind: "revise", at: "2026-09-19T11:00:00.000Z", revision: 1 },
  ]);
  assert.deepEqual(
    sorted.map((e) => e.id),
    ["v0", "r1", "b"],
  );
});

test("buildProjectTimelineVersions merges bug after revises by time", () => {
  const versions = buildProjectTimelineVersions(
    {
      allReq: true,
      modules: [
        {
          id: "main",
          title: "Main",
          status: "confirmed",
          card: { goal: "Ship", acceptance: "ok", outOfScope: "", assumptions: "" },
        },
      ],
      reviseCards: [
        {
          revision: 1,
          at: "2026-09-19T10:00:00.000Z",
          goal: "Tweak",
          acceptance: "see it",
          outOfScope: "",
          assumptions: "",
        },
      ],
      bugCards: [
        {
          id: "bug-1",
          seq: 1,
          at: "2026-09-20T08:00:00.000Z",
          goal: "Broken button",
          acceptance: "click works",
          outOfScope: "",
          assumptions: "",
        },
      ],
      updatedAt: "2026-09-18T09:00:00.000Z",
      initialAt: "2026-09-18T09:00:00.000Z",
    },
    {
      initial: "初版",
      revise: (n) => `第 ${n} 次改进`,
      bug: (n) => `缺陷 ${n}`,
    },
  );
  assert.equal(versions.length, 3);
  assert.equal(versions[0].kind, "initial");
  assert.equal(versions[1].kind, "revise");
  assert.equal(versions[2].kind, "bug");
  assert.match(versions[2].label, /缺陷/);
  assert.ok(versions[2].bug?.goal);
});
