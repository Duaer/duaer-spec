/**
 * Delivery status for FDE portfolio + progress cockpit.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveProjectDeliveryStatus,
  stageTone,
} from "../web/live-dev/delivery-status.mjs";
import {
  buildProjectList,
  enrichProjectsWithDeliveryStatus,
} from "../bin/live-projects.mjs";

test("deriveProjectDeliveryStatus drafting when empty", () => {
  const d = deriveProjectDeliveryStatus({});
  assert.equal(d.status, "drafting");
  assert.equal(d.nextAction, "chat");
  assert.equal(d.hasDeliverables, false);
});

test("deriveProjectDeliveryStatus confirming modules", () => {
  const d = deriveProjectDeliveryStatus({
    modules: [
      { id: "a", status: "confirmed", title: "A" },
      { id: "b", status: "draft", title: "B" },
    ],
  });
  assert.equal(d.status, "confirming");
  assert.equal(d.nextAction, "confirm_module");
  assert.equal(d.hasDeliverables, true);
});

test("deriveProjectDeliveryStatus kickoff after arch confirm", () => {
  const d = deriveProjectDeliveryStatus({
    modules: [{ id: "a", status: "confirmed", title: "A" }],
    architecture: { url: "/a.html", confirmed: true },
  });
  assert.equal(d.status, "confirming");
  assert.equal(d.nextAction, "kickoff");
});

test("deriveProjectDeliveryStatus building and delivered", () => {
  const building = deriveProjectDeliveryStatus(
    { jobId: "001-x", modules: [{ id: "a", status: "confirmed" }] },
    { progressDone: 1, progressTotal: 3 },
  );
  assert.equal(building.status, "building");
  assert.equal(building.nextAction, "wait_workers");

  const delivered = deriveProjectDeliveryStatus(
    { jobId: "001-x", modules: [{ id: "a", status: "confirmed" }] },
    { jobStatus: "accepted", deliveryAccepted: true },
  );
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.nextAction, "view_deliverables");
});

test("stageTone maps done/partial/empty", () => {
  const tones = stageTone([
    { id: "requirements", done: true, partial: false },
    { id: "architecture", done: false, partial: true },
    { id: "kickoff", done: false, partial: false },
  ]);
  assert.deepEqual(
    tones.map((t) => t.tone),
    ["done", "partial", "empty"],
  );
});

test("enrichProjectsWithDeliveryStatus fills portfolio fields", () => {
  const bag = buildProjectList({
    repos: [{ path: "/tmp/lab", title: "Lab" }],
    jobs: [],
    activeProjectPath: "/tmp/lab",
  });
  enrichProjectsWithDeliveryStatus(bag, () => ({
    modules: [{ id: "m1", status: "confirmed", title: "M" }],
    architecture: { url: "/x", confirmed: false },
  }));
  assert.equal(bag.projects[0].deliveryStatus, "confirming");
  assert.equal(bag.projects[0].nextAction, "confirm_arch");
  assert.equal(bag.projects[0].hasDeliverables, true);
});
