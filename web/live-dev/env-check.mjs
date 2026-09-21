/**
 * FDE-03: joint debug does not start until the customer environment
 * checklist records DNS, TLS, CORS, auth, and third-party reachability
 * as passed. The desk does not scan the customer network.
 */

const PROBES = [
  { label: "DNS", re: /\bdns\b|域名解析/i },
  { label: "TLS", re: /\btls\b|证书|憑證|\bhttps\b/i },
  { label: "CORS", re: /\bcors\b/i },
  { label: "鉴权", re: /鉴权|鑑權|认证|認證|\bauth(?:entication|n|z)?\b|\bsso\b|登录态|登入態/i },
  { label: "第三方可达", re: /第三方|third[- ]party/i },
];

const FAIL_RE = /失败|失敗|不通|未通过|未通過|不可达|不可達|blocked|\bfail(?:ed|ure)?\b/i;
const PASS_RE = /通过|通過|已探测|已探測|全绿|全綠|\bpass(?:ed)?\b|reachable/i;

export function envChecklistDeclaresNoCustomer(text) {
  return /无客户联调|無客戶聯調|无客户环境|無客戶環境|no customer environment/i.test(
    String(text || ""),
  );
}

export function missingEnvChecklist(text) {
  const t = String(text || "").trim();
  if (envChecklistDeclaresNoCustomer(t)) return [];
  const missing = [];
  for (const probe of PROBES) {
    if (!probe.re.test(t)) missing.push(probe.label);
  }
  if (FAIL_RE.test(t)) missing.push("存在未通过项，不能开工");
  else if (!PASS_RE.test(t)) missing.push("探测结果（通过）");
  return missing;
}

/** Kickoff schedules a probe only when a customer environment was declared. */
export function envChecklistNeedsProbe(text) {
  const t = String(text || "").trim();
  if (!t || envChecklistDeclaresNoCustomer(t)) return false;
  return true;
}
