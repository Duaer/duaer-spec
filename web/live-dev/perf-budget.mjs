/**
 * FDE-08: a page is not done when it merely "feels fast".
 * The confirm card records LCP, INP, bundle size, virtualized long lists,
 * and how weak-network and large-data runs are tested.
 * The desk does not run the customer's performance lab.
 */

const PARTS = [
  { label: "LCP", re: /\blcp\b/i },
  { label: "INP", re: /\binp\b/i },
  { label: "包体", re: /包体|包大小|\bbundle\b/i },
  { label: "长列表", re: /虚拟滚动|virtual scroll|长列表|長列表/i },
  { label: "弱网", re: /弱网|弱網|weak network|\b3g\b/i },
  { label: "大数据压测", re: /大数据|大數據|large data/i },
];

export function perfBudgetDeclaresNone(text) {
  return /本模块无页面性能要求|本模組無頁面性能要求|no page performance/i.test(
    String(text || ""),
  );
}

export function missingPerfBudget(text) {
  const t = String(text || "").trim();
  if (perfBudgetDeclaresNone(t)) return [];
  const missing = [];
  for (const part of PARTS) {
    if (!part.re.test(t)) missing.push(part.label);
  }
  return missing;
}

/** Kickoff schedules the budget only when page performance was declared. */
export function perfBudgetNeedsTask(text) {
  const t = String(text || "").trim();
  if (!t || perfBudgetDeclaresNone(t)) return false;
  return true;
}
