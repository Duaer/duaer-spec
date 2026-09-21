/**
 * FDE-05: a third-party, ERP, or SSO dependency must not silently own
 * the schedule. The confirm card records a blocker, an SLA, a backup
 * mock, and a parallel path. The desk does not call the vendor.
 */

const PARTS = [
  { label: "阻塞项", re: /阻塞|blocker/i },
  { label: "SLA", re: /\bsla\b/i },
  { label: "备用 Mock", re: /\bmock\b|备用|備用/i },
  { label: "并行路径", re: /并行|並行|parallel/i },
];

export function externalDepsDeclaresNone(text) {
  return /本模块无外部依赖|本模組無外部依賴|无第三方依赖|無第三方依賴|no external dependency/i.test(
    String(text || ""),
  );
}

export function missingExternalDeps(text) {
  const t = String(text || "").trim();
  if (externalDepsDeclaresNone(t)) return [];
  const missing = [];
  for (const part of PARTS) {
    if (!part.re.test(t)) missing.push(part.label);
  }
  return missing;
}

/** Kickoff schedules the board only when an external dependency was declared. */
export function externalDepsNeedsTask(text) {
  const t = String(text || "").trim();
  if (!t || externalDepsDeclaresNone(t)) return false;
  return true;
}
