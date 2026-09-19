/**
 * Pure delivery status for FDE project portfolio + progress cockpit.
 * Shared by live server (project list) and desk UI.
 */

/**
 * @param {unknown} modules
 */
function modulesAllConfirmed(modules) {
  const list = Array.isArray(modules) ? modules : [];
  if (!list.length) return false;
  return list.every((m) => m && m.status === "confirmed");
}

/**
 * @typedef {'drafting'|'confirming'|'building'|'delivered'|'revising'} DeliveryStatus
 * @typedef {'chat'|'confirm_module'|'confirm_arch'|'kickoff'|'wait_workers'|'view_deliverables'|'revise'} NextAction
 */

/**
 * Derive portfolio / cockpit status from a project chat session (+ optional job).
 * @param {object|null|undefined} session
 * @param {{
 *   jobStatus?: string|null,
 *   deliveryAccepted?: boolean,
 *   progressDone?: number,
 *   progressTotal?: number,
 * }} [hint]
 */
export function deriveProjectDeliveryStatus(session, hint = {}) {
  const s = session && typeof session === "object" ? session : {};
  const modules = Array.isArray(s.modules) ? s.modules : [];
  const confirmed = modules.filter((m) => m && m.status === "confirmed");
  const allReq = modulesAllConfirmed(modules);
  const arch =
    s.architecture && typeof s.architecture === "object" ? s.architecture : {};
  const reviseCards = Array.isArray(s.reviseCards) ? s.reviseCards : [];
  const hasJob = Boolean(s.jobId);
  const jobStatus = String(hint.jobStatus || "").toLowerCase();
  const deliveryAccepted =
    Boolean(hint.deliveryAccepted) || jobStatus === "accepted";
  const progressTotal = Number(hint.progressTotal) || 0;
  const progressDone = Number(hint.progressDone) || 0;
  const buildingIncomplete =
    hasJob &&
    !deliveryAccepted &&
    progressTotal > 0 &&
    progressDone < progressTotal;

  /** @type {DeliveryStatus} */
  let status = "drafting";
  /** @type {NextAction} */
  let nextAction = "chat";

  if (deliveryAccepted && (reviseCards.length > 0 || s.reviseLocked)) {
    status = "revising";
    nextAction = s.revisePlanConfirmed ? "kickoff" : "revise";
  } else if (deliveryAccepted) {
    status = "delivered";
    nextAction = "view_deliverables";
  } else if (reviseCards.length > 0 || Number(s.lastRevision?.revision) > 0) {
    status = "revising";
    nextAction = "revise";
  } else if (hasJob) {
    status = "building";
    nextAction = buildingIncomplete ? "wait_workers" : "view_deliverables";
  } else if (allReq && arch.confirmed) {
    status = "confirming";
    nextAction = "kickoff";
  } else if (allReq && !arch.confirmed) {
    status = "confirming";
    nextAction = "confirm_arch";
  } else if (confirmed.length > 0 || modules.length > 0) {
    status = "confirming";
    nextAction = "confirm_module";
  } else {
    status = "drafting";
    nextAction = "chat";
  }

  const stages = [
    {
      id: "requirements",
      done: allReq,
      partial: confirmed.length > 0 && !allReq,
    },
    {
      id: "architecture",
      done: Boolean(arch.confirmed),
      partial: Boolean(arch.url) && !arch.confirmed,
    },
    {
      id: "kickoff",
      done: hasJob,
      partial: false,
    },
    {
      id: "delivery",
      done: deliveryAccepted,
      partial: hasJob && !deliveryAccepted,
    },
    {
      id: "revise",
      done: reviseCards.length > 0 && deliveryAccepted,
      partial: reviseCards.length > 0 && !deliveryAccepted,
    },
  ];

  const hasDeliverables =
    confirmed.length > 0 ||
    Boolean(arch.url) ||
    hasJob ||
    reviseCards.length > 0 ||
    Boolean(s.originalCard?.goal);

  return {
    status,
    nextAction,
    hasDeliverables,
    stages,
    confirmedCount: confirmed.length,
    moduleCount: modules.length,
  };
}

/**
 * Compact stage tokens for UI (done | partial | empty).
 * @param {ReturnType<typeof deriveProjectDeliveryStatus>['stages']} stages
 */
export function stageTone(stages) {
  return (Array.isArray(stages) ? stages : []).map((st) => ({
    id: st.id,
    tone: st.done ? "done" : st.partial ? "partial" : "empty",
  }));
}
