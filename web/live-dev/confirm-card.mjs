/**
 * Fields the feature confirm card must keep across refresh.
 * @param {object | null | undefined} source module or flat card
 */
export function restoreConfirmCard(source) {
  const raw = source && typeof source === "object" ? source : {};
  const card = raw.card && typeof raw.card === "object" ? raw.card : raw;
  const pick = (key) => String(card[key] || raw[key] || "");
  return {
    goal: pick("goal"),
    outOfScope: pick("outOfScope"),
    acceptance: pick("acceptance"),
    assumptions: pick("assumptions"),
    deviceMatrix: pick("deviceMatrix"),
    criticalPaths: pick("criticalPaths"),
    exceptionCases: pick("exceptionCases"),
    apiContract: pick("apiContract"),
    envChecklist: pick("envChecklist"),
    dataPrecheck: pick("dataPrecheck"),
    externalDeps: pick("externalDeps"),
  };
}
