/**
 * Modular requirements + dependency-aware task pool for live desk FDE.
 */

import { splitAcceptanceLines } from "../web/live-dev/acceptance-lines.mjs";
import {
  EMPLOYEE_ROLES,
  clipEmployeeRole,
} from "../web/live-dev/employee-catalog.mjs";
import {
  apiContractRefs,
  modulesNeedApiContractTasks,
} from "../web/live-dev/api-contract.mjs";
import { missingUatCases } from "../web/live-dev/uat-pack.mjs";
import { missingCompatMatrix } from "../web/live-dev/compat-matrix.mjs";
import {
  envChecklistNeedsProbe,
  missingEnvChecklist,
} from "../web/live-dev/env-check.mjs";

function clipCard(card) {
  if (!card || typeof card !== "object") {
    return {
      goal: "",
      outOfScope: "",
      acceptance: "",
      assumptions: "",
      deviceMatrix: "",
      criticalPaths: "",
      exceptionCases: "",
      apiContract: "",
      envChecklist: "",
    };
  }
  return {
    goal: String(card.goal || "").slice(0, 8000),
    outOfScope: String(card.outOfScope || "").slice(0, 8000),
    acceptance: String(card.acceptance || "").slice(0, 8000),
    assumptions: String(card.assumptions || "").slice(0, 8000),
    deviceMatrix: String(card.deviceMatrix || "").slice(0, 4000),
    criticalPaths: String(card.criticalPaths || "").slice(0, 4000),
    exceptionCases: String(card.exceptionCases || "").slice(0, 4000),
    apiContract: String(card.apiContract || "").slice(0, 4000),
    envChecklist: String(card.envChecklist || "").slice(0, 4000),
  };
}

function slugId(title, fallback = "module") {
  const raw = String(title || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return raw || fallback;
}

const MODULE_STATUSES = new Set(["draft", "ready", "confirmed"]);

/**
 * @param {unknown} raw
 * @returns {{ id: string, title: string, status: string, card: ReturnType<typeof clipCard>, dependsOn: string[] } | null}
 */
export function clipModule(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim().slice(0, 80);
  if (!id) return null;
  const status = MODULE_STATUSES.has(raw.status) ? raw.status : "draft";
  const dependsOn = Array.isArray(raw.dependsOn)
    ? raw.dependsOn.map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 20)
    : [];
  return {
    id,
    title: String(raw.title || id).trim().slice(0, 120) || id,
    status,
    card: clipCard(raw.card || raw),
    dependsOn,
  };
}

/**
 * @param {unknown} list
 * @param {object|null} legacyCard
 */
export function clipModules(list, legacyCard = null) {
  if (Array.isArray(list) && list.length) {
    const byId = new Map();
    for (const raw of list) {
      const m = clipModule(raw);
      if (m) byId.set(m.id, m);
    }
    const out = [...byId.values()].slice(0, 40);
    if (out.length) return out;
  }
  const card = clipCard(legacyCard);
  if (card.goal || card.acceptance) {
    return [
      {
        id: "main",
        title: "Main",
        status: "draft",
        card,
        dependsOn: [],
      },
    ];
  }
  return [];
}

export function clipActiveModuleId(id, modules) {
  const want = String(id || "").trim().slice(0, 80);
  if (want && modules.some((m) => m.id === want)) return want;
  return modules[0]?.id || null;
}

export function modulesAllConfirmed(modules) {
  return Array.isArray(modules) && modules.length > 0 && modules.every((m) => m.status === "confirmed");
}

export function findModule(modules, moduleId) {
  const id = String(moduleId || "").trim();
  if (!id) return null;
  return (modules || []).find((m) => m.id === id) || null;
}

/**
 * Merge model-returned module inventory into existing modules.
 * Preserves confirmed cards unless the model sends a fuller card for a draft/ready module.
 */
export function mergeModulesFromChat(existing, incoming, activeModuleId, cardPatch) {
  const prev = clipModules(existing);
  const nextList = Array.isArray(incoming) ? incoming : null;
  let modules;
  if (nextList && nextList.length) {
    const byId = new Map(prev.map((m) => [m.id, { ...m, card: { ...m.card } }]));
    for (const raw of nextList) {
      const clipped = clipModule({
        ...raw,
        card: raw.card || {
          goal: raw.goal,
          outOfScope: raw.outOfScope,
          acceptance: raw.acceptance,
          assumptions: raw.assumptions,
        },
      });
      if (!clipped) continue;
      const old = byId.get(clipped.id);
      if (old?.status === "confirmed") {
        byId.set(clipped.id, {
          ...old,
          title: clipped.title || old.title,
          dependsOn: clipped.dependsOn.length ? clipped.dependsOn : old.dependsOn,
        });
      } else {
        byId.set(clipped.id, {
          ...clipped,
          status: old?.status === "confirmed" ? "confirmed" : clipped.status === "confirmed" ? "ready" : clipped.status,
          card: {
            goal: clipped.card.goal || old?.card.goal || "",
            outOfScope: clipped.card.outOfScope || old?.card.outOfScope || "",
            acceptance: clipped.card.acceptance || old?.card.acceptance || "",
            assumptions: clipped.card.assumptions || old?.card.assumptions || "",
          },
        });
      }
    }
    modules = [...byId.values()].slice(0, 40);
  } else {
    modules = prev.length
      ? prev
      : [
          {
            id: "main",
            title: "Main",
            status: "draft",
            card: clipCard(null),
            dependsOn: [],
          },
        ];
  }

  let activeId = clipActiveModuleId(activeModuleId, modules);
  if (!activeId) {
    activeId = modules[0]?.id || "main";
    if (!modules.length) {
      modules = [
        {
          id: "main",
          title: "Main",
          status: "draft",
          card: clipCard(null),
          dependsOn: [],
        },
      ];
      activeId = "main";
    }
  }

  const patch = clipCard(cardPatch);
  const hasPatch = patch.goal || patch.outOfScope || patch.acceptance || patch.assumptions;
  if (hasPatch) {
    modules = modules.map((m) => {
      if (m.id !== activeId || m.status === "confirmed") return m;
      return {
        ...m,
        status: m.status === "confirmed" ? "confirmed" : "draft",
        card: {
          goal: patch.goal || m.card.goal,
          outOfScope: patch.outOfScope || m.card.outOfScope,
          acceptance: patch.acceptance || m.card.acceptance,
          assumptions: patch.assumptions || m.card.assumptions,
        },
      };
    });
  }

  return { modules, activeModuleId: activeId };
}

/** Mark one module confirmed; returns updated list. */
export function confirmModuleInList(modules, moduleId, card) {
  const id = String(moduleId || "").trim();
  const c = clipCard(card);
  return clipModules(modules).map((m) =>
    m.id === id
      ? { ...m, status: "confirmed", card: c.goal || c.acceptance ? c : m.card }
      : m,
  );
}

/** Aggregate confirmed modules into one Brief-shaped card. */
export function aggregateModulesCard(modules) {
  const list = clipModules(modules).filter((m) => m.status === "confirmed");
  if (!list.length) {
    return { goal: "", outOfScope: "", acceptance: "", assumptions: "" };
  }
  if (list.length === 1) {
    return { ...list[0].card };
  }
  const goal = list.map((m) => `[${m.title}] ${m.card.goal}`).join("\n");
  const outOfScope = list
    .map((m) => (m.card.outOfScope ? `[${m.title}] ${m.card.outOfScope}` : ""))
    .filter(Boolean)
    .join("\n");
  const acceptance = list
    .map((m) => `[${m.title}] ${m.card.acceptance}`)
    .join("\n");
  const assumptions = list
    .map((m) => (m.card.assumptions ? `[${m.title}] ${m.card.assumptions}` : ""))
    .filter(Boolean)
    .join("\n");
  return { goal, outOfScope, acceptance, assumptions };
}

/**
 * Short defect task pool: reproduce → fix → acceptance atoms → regress → README → stamp.
 * Used when desk kind is bug (not the modular feature implement chain).
 */
export function buildBugTaskPool(modules, { deployNeeded = false, deployTaskText = null } = {}) {
  const list = clipModules(modules).filter((m) => m.status === "confirmed");
  const card =
    list[0]?.card ||
    ({ goal: "", outOfScope: "", acceptance: "", assumptions: "" });
  const modId = list[0]?.id || "bug";
  const title = String(list[0]?.title || "Bug").slice(0, 80);
  const tasks = [];
  let n = 1;
  const push = (partial) => {
    const id = `T${String(n).padStart(3, "0")}`;
    n += 1;
    const task = {
      id,
      moduleId: partial.moduleId || null,
      title: String(partial.title || "").slice(0, 200),
      dependsOn: Array.isArray(partial.dependsOn)
        ? partial.dependsOn.filter(Boolean)
        : [],
      role: clipEmployeeRole(partial.role),
      status: "queued",
      workerId: null,
    };
    tasks.push(task);
    return task;
  };

  const repro = push({
    moduleId: modId,
    title: `Reproduce defect «${title}»: ${truncate(card.goal, 100)}`,
    dependsOn: [],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  const fix = push({
    moduleId: modId,
    title: `Fix defect «${title}»`,
    dependsOn: [repro.id],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  let prevId = fix.id;
  const acceptLines = splitAcceptanceLines(card.acceptance);
  if (acceptLines.length) {
    for (const line of acceptLines) {
      const acc = push({
        moduleId: modId,
        title: `Satisfy acceptance (alone) «${title}»: ${truncate(line, 120)}`,
        dependsOn: [prevId],
        role: EMPLOYEE_ROLES.IMPLEMENT,
      });
      prevId = acc.id;
    }
  }
  const verify = push({
    moduleId: null,
    title:
      "Regression verify against testing.md (repro closed; L0–L3 when applicable)",
    dependsOn: [prevId],
    role: EMPLOYEE_ROLES.VERIFY_L3,
  });
  const readme = push({
    moduleId: null,
    title:
      "Update product README if the fix changes run/docs (else note N/A)",
    dependsOn: [verify.id],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  push({
    moduleId: null,
    title:
      "Stamp delivery.json accepted with verification evidence (preview.url when applicable)",
    dependsOn: [readme.id],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  if (deployNeeded) {
    push({
      moduleId: null,
      title:
        deployTaskText ||
        "Deploy with GitHub CLI (`gh`) + Actions; write public URL to preview.url",
      dependsOn: [tasks[tasks.length - 1].id],
      role: EMPLOYEE_ROLES.DEPLOY,
    });
  }

  return {
    version: 1,
    kind: "bug",
    createdAt: new Date().toISOString(),
    tasks,
  };
}

/**
 * Build a dependency-aware task pool from confirmed modules.
 * Default: later modules depend on the previous module's verify task (serial chain),
 * unless module.dependsOn lists other module ids (then depend on those modules' verify tasks).
 *
 * Atomic rule: one checkbox task per independently verifiable acceptance line so
 * FDE can monitor progress; never fold multiple acceptance criteria into one task.
 */
export function buildTaskPoolFromModules(modules, { deployNeeded = false, deployTaskText = null } = {}) {
  const list = clipModules(modules).filter((m) => m.status === "confirmed");
  const tasks = [];
  const moduleVerifyId = new Map();
  let n = 1;
  const push = (partial) => {
    const id = `T${String(n).padStart(3, "0")}`;
    n += 1;
    const task = {
      id,
      moduleId: partial.moduleId || null,
      title: String(partial.title || "").slice(0, 200),
      dependsOn: Array.isArray(partial.dependsOn) ? partial.dependsOn.filter(Boolean) : [],
      role: clipEmployeeRole(partial.role),
      status: "queued",
      workerId: null,
    };
    tasks.push(task);
    return task;
  };

  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    const envDeps = [];
    if (envChecklistNeedsProbe(m.card?.envChecklist)) {
      const envGap = missingEnvChecklist(m.card?.envChecklist);
      const envNote = envGap.length ? `; still missing ${envGap.join("/")}` : "";
      const env = push({
        moduleId: m.id,
        title: `FDE-03: env probe «${m.title}» — DNS, TLS, CORS, auth, third-party; block joint debug until green${envNote}`,
        dependsOn: [],
        role: EMPLOYEE_ROLES.VERIFY_L3,
      });
      envDeps.push(env.id);
    }
    const impl = push({
      moduleId: m.id,
      title: `Implement module «${m.title}»: ${truncate(m.card.goal, 100)}`,
      dependsOn: envDeps,
      role: EMPLOYEE_ROLES.IMPLEMENT,
    });
    const acceptLines = splitAcceptanceLines(m.card.acceptance);
    let prevId = impl.id;
    if (acceptLines.length) {
      for (const line of acceptLines) {
        const acc = push({
          moduleId: m.id,
          title: `Satisfy acceptance (alone) «${m.title}»: ${truncate(line, 120)}`,
          dependsOn: [prevId],
          role: EMPLOYEE_ROLES.IMPLEMENT,
        });
        prevId = acc.id;
      }
    } else {
      const acc = push({
        moduleId: m.id,
        title: `Satisfy acceptance for «${m.title}»: ${truncate(m.card.acceptance || m.card.goal, 100)}`,
        dependsOn: [impl.id],
        role: EMPLOYEE_ROLES.IMPLEMENT,
      });
      prevId = acc.id;
    }
    const verify = push({
      moduleId: m.id,
      title: `Verify «${m.title}» against acceptance`,
      dependsOn: [prevId],
      role: EMPLOYEE_ROLES.VERIFY_L3,
    });
    moduleVerifyId.set(m.id, verify.id);

    // Cross-module deps
    const depMods =
      m.dependsOn.length > 0
        ? m.dependsOn
        : i > 0
          ? [list[i - 1].id]
          : [];
    for (const depMod of depMods) {
      const depVerify = moduleVerifyId.get(depMod);
      if (depVerify && !impl.dependsOn.includes(depVerify)) {
        impl.dependsOn.push(depVerify);
      }
    }
  }

  const verifyDeps = [...moduleVerifyId.values()];
  const uatIds = [];
  for (const m of list) {
    const missing = missingUatCases(m.card?.exceptionCases);
    const gap = missing.length ? `; still missing ${missing.join("/")}` : "";
    const uat = push({
      moduleId: m.id,
      title: `FDE-07: UAT pack «${m.title}» — empty / failure / permission / timeout / retry${gap}`,
      dependsOn: [moduleVerifyId.get(m.id)].filter(Boolean),
      role: EMPLOYEE_ROLES.VERIFY_L3,
    });
    uatIds.push(uat.id);
    const compatGap = missingCompatMatrix(m.card?.deviceMatrix);
    const compatNote = compatGap.length ? `; still missing ${compatGap.join("/")}` : "";
    const compat = push({
      moduleId: m.id,
      title: `FDE-04: compat evidence «${m.title}» — named browsers, screenshot/cloud run, polyfill/fallback${compatNote}`,
      dependsOn: [uat.id],
      role: EMPLOYEE_ROLES.VERIFY_L3,
    });
    uatIds.push(compat.id);
  }
  let gate = uatIds.length ? uatIds : verifyDeps;
  if (modulesNeedApiContractTasks(list)) {
    const refs = apiContractRefs(list).join(" · ") || "declared contracts";
    const align = push({
      moduleId: null,
      title: `FDE-07: align UAT failures with contract error codes (${truncate(refs, 120)})`,
      dependsOn: gate,
      role: EMPLOYEE_ROLES.VERIFY_L3,
    });
    const sync = push({
      moduleId: null,
      title: `FDE-02: sync API contract as SSOT (${truncate(refs, 120)})`,
      dependsOn: [align.id],
      role: EMPLOYEE_ROLES.IMPLEMENT,
    });
    const mock = push({
      moduleId: null,
      title: "FDE-02: generate/update Mock from the contract",
      dependsOn: [sync.id],
      role: EMPLOYEE_ROLES.IMPLEMENT,
    });
    const ci = push({
      moduleId: null,
      title:
        "FDE-02: CI provider contract test; add command to .duaer/memory/verify.json",
      dependsOn: [mock.id],
      role: EMPLOYEE_ROLES.VERIFY_L3,
    });
    gate = [ci.id];
  }
  const verifyAll = push({
    moduleId: null,
    title: "Risk-based verification per testing.md (L0–L3 / Playwright when applicable)",
    dependsOn: gate,
    role: EMPLOYEE_ROLES.VERIFY_L3,
  });
  const readme = push({
    moduleId: null,
    title:
      "Update product README to match delivered requirements (modules/goal/acceptance/how to run)",
    dependsOn: [verifyAll.id],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  push({
    moduleId: null,
    title:
      "Start preview service; stamp delivery.json accepted with preview.url",
    dependsOn: [readme.id],
    role: EMPLOYEE_ROLES.IMPLEMENT,
  });
  if (deployNeeded) {
    push({
      moduleId: null,
      title:
        deployTaskText ||
        "Deploy with GitHub CLI (`gh`) + Actions; write public URL to preview.url",
      dependsOn: [tasks[tasks.length - 1].id],
      role: EMPLOYEE_ROLES.DEPLOY,
    });
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    tasks,
  };
}

export function taskPoolToMarkdown(pool) {
  const tasks = Array.isArray(pool?.tasks) ? pool.tasks : [];
  const lines = tasks.map((t) => {
    const deps =
      t.dependsOn?.length > 0 ? ` (depends: ${t.dependsOn.join(", ")})` : "";
    const mod = t.moduleId ? ` [${t.moduleId}]` : "";
    const role = t.role ? ` {${t.role}}` : "";
    return `- [ ] ${t.id}${mod}${role} ${t.title}${deps}`;
  });
  return `# Tasks

${lines.join("\n")}

做完一步就立刻把对应项改成 \`- [x]\`，方便 Duaer-spec FDE 监控进度与编排放行。

**角色：** \`{implement}\` 实现员工 · \`{verify-l3}\` 功能回归 · \`{deploy}\` 部署员工（Cloudflare / 阿里云 / AWS / GitHub Pages）

**原子任务规则（强制）：**
- 每个勾选项只做一个可独立验证的功能点；不要把多项验收揉进同一条
- 进度必须可监控：只用 \`- [ ]\` / \`- [x]\` 勾选；禁止无 checkbox 的笼统进度叙事
- 若清单仍偏粗：开工后先按 Acceptance 扩成「一条验收一勾选」（仍用 T00x），保存后再做
- 不要为了凑数合并无关步骤；也不要人为限制条数
`;
}

/**
 * Assign tasks to 1..N workers (same CLI family). Ready roots fan out;
 * dependent tasks inherit the worker of their first dependency when possible.
 * When count ≥ 2, verify-l3 and deploy tasks go to the last lane.
 */
export function assignTasksToWorkers(pool, workerCount = 1) {
  const count = Math.max(1, Math.min(8, Number(workerCount) || 1));
  const tasks = (pool?.tasks || []).map((t) => ({
    ...t,
    role: clipEmployeeRole(t.role),
    workerId: null,
  }));
  if (count === 1) {
    for (const t of tasks) t.workerId = "w1";
    return { workerCount: 1, tasks };
  }

  // Seed: partition by moduleId for parallel modules; shared → w1.
  const moduleIds = [
    ...new Set(tasks.map((t) => t.moduleId).filter(Boolean)),
  ];
  const modWorker = new Map();
  moduleIds.forEach((mid, i) => {
    modWorker.set(mid, `w${(i % count) + 1}`);
  });
  for (const t of tasks) {
    t.workerId = t.moduleId ? modWorker.get(t.moduleId) || "w1" : "w1";
  }

  // Inherit first dependency's worker so cross-module dependsOn stays on-lane
  // when possible (walk in pool order so deps are assigned first).
  const byId = new Map(tasks.map((t) => [String(t.id || "").toUpperCase(), t]));
  for (const t of tasks) {
    const firstDep = Array.isArray(t.dependsOn) ? t.dependsOn[0] : null;
    if (!firstDep) continue;
    const dep = byId.get(String(firstDep).toUpperCase());
    if (dep?.workerId) t.workerId = dep.workerId;
  }

  // Shared / null-moduleId stay on w1 (re-assert after inherit).
  for (const t of tasks) {
    if (!t.moduleId) t.workerId = "w1";
  }

  // Regression + deploy employees own the last lane when multiple workers.
  const specialtyLane = `w${count}`;
  for (const t of tasks) {
    if (
      t.role === EMPLOYEE_ROLES.VERIFY_L3 ||
      t.role === EMPLOYEE_ROLES.DEPLOY
    ) {
      t.workerId = specialtyLane;
    }
  }

  return { workerCount: count, tasks };
}

export function clipTaskPool(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tasks)) return null;
  return {
    version: 1,
    createdAt: String(raw.createdAt || "").slice(0, 40) || null,
    tasks: raw.tasks.slice(0, 200).map((t) => ({
      id: String(t.id || "").slice(0, 20),
      moduleId: t.moduleId ? String(t.moduleId).slice(0, 80) : null,
      title: String(t.title || "").slice(0, 200),
      role: clipEmployeeRole(t.role),
      dependsOn: Array.isArray(t.dependsOn)
        ? t.dependsOn.map((x) => String(x).slice(0, 20)).slice(0, 20)
        : [],
      status: String(t.status || "queued").slice(0, 20),
      workerId: t.workerId ? String(t.workerId).slice(0, 20) : null,
    })),
  };
}

export function clipWorkerCount(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(8, Math.floor(v));
}

function truncate(s, n) {
  const t = String(s || "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, Math.max(0, n - 1))}…`;
}

export { clipCard, slugId };
