/**
 * Digital-employee directory: specialized roles for FDE kickoff / UI.
 * Runtime is still Cursor Agent or Claude Code; role constrains the Brief prompt.
 */

export const EMPLOYEE_ROLES = {
  IMPLEMENT: "implement",
  VERIFY_L3: "verify-l3",
  DEPLOY: "deploy",
};

/** Built-in catalog (id stable for i18n keys employee.<id>.*). */
export const EMPLOYEE_CATALOG = [
  {
    id: "implementer",
    role: EMPLOYEE_ROLES.IMPLEMENT,
    runtime: "cursor-or-claude",
    defaultOn: true,
  },
  {
    id: "regression",
    role: EMPLOYEE_ROLES.VERIFY_L3,
    runtime: "cursor-or-claude",
    defaultOn: true,
  },
  {
    id: "deployer",
    role: EMPLOYEE_ROLES.DEPLOY,
    runtime: "cursor-or-claude",
    defaultOn: true,
  },
];

export function employeeByRole(role) {
  return EMPLOYEE_CATALOG.find((e) => e.role === role) || null;
}

export function clipEmployeeRole(raw) {
  const r = String(raw || "").trim();
  if (r === EMPLOYEE_ROLES.VERIFY_L3) return EMPLOYEE_ROLES.VERIFY_L3;
  if (r === EMPLOYEE_ROLES.DEPLOY) return EMPLOYEE_ROLES.DEPLOY;
  return EMPLOYEE_ROLES.IMPLEMENT;
}

/**
 * Chinese dispatch blurb for a worker's owned roles (inserted into kickoff prompt).
 */
export function rolePromptZh(roles) {
  const set = new Set((roles || []).map(clipEmployeeRole));
  const parts = [];
  if (set.has(EMPLOYEE_ROLES.IMPLEMENT)) {
    parts.push(
      "【角色·实现】只做 role=implement 任务：按 Acceptance 实现功能；不要抢做 verify-l3 回归套件（除非本波只有你一人）。",
    );
  }
  if (set.has(EMPLOYEE_ROLES.VERIFY_L3)) {
    parts.push(
      "【角色·功能回归】只做 role=verify-l3 任务：对照 Acceptance，按产品 .duaer/memory/testing.md 跑确定性回归（优先 Playwright / npm test / npm run test:live 等 L0–L3）；写/补测试、执行并记录证据；不要改业务功能范围。失败则留下可复现说明，不要 stamp accepted。控制台会自己跑 .duaer/memory/verify.json；退出码非 0 会把 accepted 打回 open。不要把已有 commands 改成 waiver。",
    );
  }
  if (set.has(EMPLOYEE_ROLES.DEPLOY)) {
    parts.push(
      "【角色·部署】只做 role=deploy 任务：按控制台选定的计划托管平台（Cloudflare / 阿里云 / AWS / GitHub Pages）完成上线；把公网 URL 写入 delivery.preview.url；不要改业务功能范围。密钥只用环境变量 / 平台密钥管理，不进仓库。",
    );
  }
  return parts.join("\n");
}
