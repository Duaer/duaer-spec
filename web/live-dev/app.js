/**
 * Duaer-spec FDE UI — model-backed dialogue; Briefs go to ~/.duaer/live/jobs.
 */

import {
  t,
  initI18n,
  onLocaleChange,
  getLocale,
  setLocale,
  applyDomI18n,
} from "./i18n.js";
import { getTheme, initTheme, toggleTheme } from "./theme.mjs";
import { structuredHtml, escapeHtml, reqEditModel, serializeReqEdit } from "./structured-html.mjs";
import {
  deriveProjectDeliveryStatus,
  stageTone,
} from "./delivery-status.mjs";
import { renderChatMarkdown } from "./chat-markdown.mjs";
import { extractArchitectureIr } from "./architecture-ir.mjs";
import {
  mountArchitectureDiagram,
  clearArchitectureMount,
  architectureKeyFromArchitectureUrl,
} from "./architecture-mount.mjs?v=node-zoom-1";
import { enrichChatOptions } from "./choice-options.mjs";
import {
  baselineFingerprint,
  baselineIsValid,
  clipBaseline,
  emptyBaseline,
} from "./baseline.mjs";
import { restoreConfirmCard } from "./confirm-card.mjs";
import {
  annotateParallelTasks,
  assignPreviewWorkers,
  buildPreviewPoolFromModules,
  buildPreviewPoolForBug,
  buildTaskArchitectureIr,
  recommendWorkerCount,
  taskPoolToArchitectureIr,
} from "./task-graph.mjs";
import { EMPLOYEE_CATALOG } from "./employee-catalog.mjs";

/** Deliverables API lang: en | ja | zh */
function deliverablesLang() {
  const loc = getLocale();
  if (loc === "en" || loc === "ja") return loc;
  if (loc === "zh-TW" || loc === "zh-CN") return "zh";
  // Other desk locales: deliverables page uses English stage chrome for now.
  return "en";
}

function localeListJoin(items) {
  const loc = getLocale();
  if (loc === "zh-CN" || loc === "zh-TW" || loc === "ja" || loc === "ko") {
    return items.join("、");
  }
  return items.join(", ");
}

function localeDateTag() {
  const loc = getLocale();
  const map = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    es: "es-ES",
    "pt-BR": "pt-BR",
    fr: "fr-FR",
    de: "de-DE",
    ru: "ru-RU",
    vi: "vi-VN",
  };
  return map[loc] || "en-US";
}

const FALLBACK_PROVIDERS = [
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  { id: "custom", label: "Custom", baseUrl: "", model: "" },
];

const state = {
  ready: false,
  locked: false,
  busy: false,
  /** feature | bug — bug skips architecture by default and uses fix/ branches */
  deskKind: "feature",
  /** When deskKind=bug: base worktree on main (production hotfix) */
  bugHotfix: false,
  /** Modular requirements: [{ id, title, status, card, dependsOn }] */
  modules: [],
  activeModuleId: null,
  /** Kickoff: how many same-CLI digital employees (1..N). */
  workerCount: 1,
  taskPool: null,
  /** After operator confirms worker count and builds the dispatch graph. */
  dispatchGraphReady: false,
  dispatchGraphBuilding: false,
  dispatchGraphUrl: null,
  /** True after at least one successful graph build this desk session (regen copy). */
  dispatchGraphBuiltOnce: false,
  /** Latest /api/status progress.tasks for dispatch-graph run colors. */
  lastJobProgress: null,
  recommendedWorkerCount: 1,
  /** True while POST /api/revise is in flight (not chat). */
  reviseDispatching: false,
  /** True while POST /api/deploy is in flight. */
  deployDispatching: false,
  /** Selected host inside the Deploy picker dialog. */
  deployPickerTarget: "github-pages",
  mode: "specify", // specify | revise | architecture
  /** After a successful revise: right card stays locked 改进卡. */
  reviseLocked: false,
  /**
   * Architecture gate (after confirm, before dispatch).
   * status: idle | designing | preview | confirmed
   */
  architecture: {
    status: "idle",
    /** Always null after render — deep IR blows JSON.stringify call stack. */
    ir: null,
    /** [w, h] from IR meta.viewBox; used for iframe height without keeping IR. */
    viewBox: null,
    /** Structural fingerprint (comps/links) for change detection. */
    fingerprint: "",
    url: null,
    summary: "",
    confirmed: false,
  },
  /** Prior confirmed diagram kept above when a new one is designed. */
  architecturePrevious: null,
  architectureMessages: [],
  /** FDE-01 signed scope/acceptance baseline */
  baseline: emptyBaseline(),
  /** Revising but Terminal busy with no task progress — offer retry CTA. */
  reviseStuckHint: false,
  lastRevision: null, // { revision, change, keep, acceptance, reason }
  /** Dispatched 改进卡 history — one entry per revision (never overwrite). */
  reviseCards: [],
  /** Confirmed defect cards on the project timeline (chronological with revises). */
  bugCards: [],
  reviseDraft: null, // { revision, goal, outOfScope, acceptance, assumptions }
  /** Which revision's card is shown in the panel. */
  reviseCardFocus: null,
  /**
   * After「改进方案确认」and before architecture re-confirm / dispatch.
   * Architecture gate runs only after this is true.
   */
  revisePlanConfirmed: false,
  /** True while the left chat is in an active revise dialogue (CTA → lock). */
  reviseDialogueOpen: false,
  /** In-flight revise kickoff (prevents double-start on rapid re-clicks). */
  reviseKickoffInFlight: false,
  /** First confirmed architecture (初版), for accordion + change detection. */
  initialArchitecture: null,
  /** Accordion open state keyed by "0" | "1" | "2" | "draft". Default: open. */
  reviseExpanded: {},
  /** Fingerprint to avoid rebuilding accordion DOM on every status poll. */
  reviseAccordionFp: "",
  originalCard: null, // snapshot after first confirm
  lastStatus: null,
  lastDeliveryAccepted: false,
  rawAsk: "",
  messages: [],
  reviseMessages: [],
  providers: FALLBACK_PROVIDERS.map((p) => ({ ...p })),
  providerId: "deepseek",
  jobId: null,
  statusTimer: null,
  repoCatalog: { recent: [], discovered: [] },
  agents: [],
  missingAgents: [],
  agentId: "cursor-agent",
  /** Planned host: none | cloudflare | aliyun | aws | github-pages */
  deployTarget: "none",
  /** null | "working" | "done" — dispatch button phase */
  dispatchPhase: null,
  lastDispatch: null,
  lastPreviewUrl: null,
  /** Follow latest result version unless user picks an older chip. */
  previewFollowLatest: true,
  previewFocusRevision: null,
  lastCfg: null,
  lastUpdate: null,
  historyJobs: [],
  selectedHistoryId: null,
  selectedHistoryDetail: null,
  /** Absolute path of the active product project (required before chat). */
  projectPath: null,
  projectName: null,
  projectDescription: null,
  projects: [],
  unassignedJobs: [],
  /** Active run-block for progress polling ({ revision, root, summary, tasks, log }). */
  activeRun: null,
  /** Last progress focus key — skip auto-scroll when poll is unchanged. */
  progressFocusKey: "",
  /**
   * Pre-send validation gate.
   * status: idle | checking | passed | failed
   */
  validate: {
    kind: "confirm",
    fingerprint: "",
    status: "idle",
    summary: "",
    issues: [],
  },
  validateTimer: 0,
  validateSeq: 0,
  /** Timestamp when busy became true (ms); 0 when idle. */
  busySince: 0,
  /** Dedupe identical composer-block notices. */
  lastChatBlockMsg: "",
};

const el = {
  setup: document.getElementById("setup"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsClose: document.getElementById("settingsClose"),
  desk: document.getElementById("desk"),
  log: document.getElementById("log"),
  chatQuickNav: document.getElementById("chatQuickNav"),
  chatQuickNavMenu: document.getElementById("chatQuickNavMenu"),
  chatQuickNavWrap: document.getElementById("chatQuickNavWrap"),
  chatEmpty: document.getElementById("chatEmpty"),
  form: document.getElementById("composer"),
  input: document.getElementById("input"),
  goal: document.getElementById("goal"),
  outOfScope: document.getElementById("outOfScope"),
  acceptance: document.getElementById("acceptance"),
  assumptions: document.getElementById("assumptions"),
  deviceMatrix: document.getElementById("deviceMatrix"),
  criticalPaths: document.getElementById("criticalPaths"),
  exceptionCases: document.getElementById("exceptionCases"),
  goalView: document.getElementById("goalView"),
  outOfScopeView: document.getElementById("outOfScopeView"),
  acceptanceView: document.getElementById("acceptanceView"),
  assumptionsView: document.getElementById("assumptionsView"),
  deviceMatrixView: document.getElementById("deviceMatrixView"),
  criticalPathsView: document.getElementById("criticalPathsView"),
  exceptionCasesView: document.getElementById("exceptionCasesView"),
  deviceMatrixField: document.getElementById("deviceMatrixField"),
  criticalPathsField: document.getElementById("criticalPathsField"),
  exceptionCasesField: document.getElementById("exceptionCasesField"),
  apiContract: document.getElementById("apiContract"),
  apiContractView: document.getElementById("apiContractView"),
  apiContractField: document.getElementById("apiContractField"),
  envChecklist: document.getElementById("envChecklist"),
  envChecklistView: document.getElementById("envChecklistView"),
  envChecklistField: document.getElementById("envChecklistField"),
  dataPrecheck: document.getElementById("dataPrecheck"),
  dataPrecheckView: document.getElementById("dataPrecheckView"),
  dataPrecheckField: document.getElementById("dataPrecheckField"),
  externalDeps: document.getElementById("externalDeps"),
  externalDepsView: document.getElementById("externalDepsView"),
  externalDepsField: document.getElementById("externalDepsField"),
  perfBudget: document.getElementById("perfBudget"),
  perfBudgetView: document.getElementById("perfBudgetView"),
  perfBudgetField: document.getElementById("perfBudgetField"),
  lblDevice: document.getElementById("lblDevice"),
  lblPaths: document.getElementById("lblPaths"),
  lblExceptions: document.getElementById("lblExceptions"),
  baselinePanel: document.getElementById("baselinePanel"),
  baselineStatus: document.getElementById("baselineStatus"),
  baselineSigner: document.getElementById("baselineSigner"),
  baselineSignerRow: document.getElementById("baselineSignerRow"),
  baselineChangeRow: document.getElementById("baselineChangeRow"),
  baselineChangeReason: document.getElementById("baselineChangeReason"),
  baselineSign: document.getElementById("baselineSign"),
  baselineChange: document.getElementById("baselineChange"),
  confirm: document.getElementById("confirm"),
  result: document.getElementById("result"),
  lockHint: document.getElementById("lockHint"),
  validateHint: document.getElementById("validateHint"),
  reviseValidateHint: document.getElementById("reviseValidateHint"),
  autoFixCard: document.getElementById("autoFixCard"),
  autoFixRevise: document.getElementById("autoFixRevise"),
  meta: document.getElementById("meta"),
  send: document.getElementById("send"),
  voice: document.getElementById("voice"),
  cfgProviders: document.getElementById("cfgProviders"),
  cfgBase: document.getElementById("cfgBase"),
  cfgKey: document.getElementById("cfgKey"),
  cfgModel: document.getElementById("cfgModel"),
  cfgSttBase: document.getElementById("cfgSttBase"),
  cfgSttKey: document.getElementById("cfgSttKey"),
  cfgSttModel: document.getElementById("cfgSttModel"),
  saveSttCfg: document.getElementById("saveSttCfg"),
  clearSttCfg: document.getElementById("clearSttCfg"),
  sttCfgMsg: document.getElementById("sttCfgMsg"),
  cfgAliyunId: document.getElementById("cfgAliyunId"),
  cfgAliyunSecret: document.getElementById("cfgAliyunSecret"),
  saveAliyunCfg: document.getElementById("saveAliyunCfg"),
  clearAliyunCfg: document.getElementById("clearAliyunCfg"),
  aliyunCfgMsg: document.getElementById("aliyunCfgMsg"),
  cfgCfToken: document.getElementById("cfgCfToken"),
  cfgCfAccount: document.getElementById("cfgCfAccount"),
  saveCfCfg: document.getElementById("saveCfCfg"),
  clearCfCfg: document.getElementById("clearCfCfg"),
  cfCfgMsg: document.getElementById("cfCfgMsg"),
  cfgAwsId: document.getElementById("cfgAwsId"),
  cfgAwsSecret: document.getElementById("cfgAwsSecret"),
  cfgAwsRegion: document.getElementById("cfgAwsRegion"),
  saveAwsCfg: document.getElementById("saveAwsCfg"),
  clearAwsCfg: document.getElementById("clearAwsCfg"),
  awsCfgMsg: document.getElementById("awsCfgMsg"),
  saveCfg: document.getElementById("saveCfg"),
  cfgOpen: document.getElementById("cfgOpen"),
  githubStars: document.getElementById("githubStars"),
  githubStarCount: document.getElementById("githubStarCount"),
  cfgBack: document.getElementById("cfgBack"),
  cfgErr: document.getElementById("cfgErr"),
  dispatch: document.getElementById("dispatch"),
  repoList: document.getElementById("repoList"),
  repoPath: document.getElementById("repoPath"),
  projectsRoot: document.getElementById("projectsRoot"),
  pickProjectsRoot: document.getElementById("pickProjectsRoot"),
  clearProjectsRoot: document.getElementById("clearProjectsRoot"),
  projectFolder: document.getElementById("projectFolder"),
  projectTitle: document.getElementById("projectTitle"),
  projectDescription: document.getElementById("projectDescription"),
  projectActivate: document.getElementById("projectActivate"),
  projectBrowse: document.getElementById("projectBrowse"),
  projectList: document.getElementById("projectList"),
  projectGateHint: document.getElementById("projectGateHint"),
  dispatchProjectLine: document.getElementById("dispatchProjectLine"),
  dispatchProjectPath: document.getElementById("dispatchProjectPath"),
  dispatchProjectSummary: document.getElementById("dispatchProjectSummary"),
  repoPickBlock: document.getElementById("repoPickBlock"),
  repoPickActions: document.getElementById("repoPickActions"),
  repoFilterField: document.getElementById("repoFilterField"),
  repoFilter: document.getElementById("repoFilter"),
  repoBrowse: document.getElementById("repoBrowse"),
  repoScan: document.getElementById("repoScan"),
  agentList: document.getElementById("agentList"),
  deployTargetList: document.getElementById("deployTargetList"),
  architecturePanel: document.getElementById("architecturePanel"),
  architectureSlotDeploy: document.getElementById("architectureSlotDeploy"),
  architectureSlotRevise: document.getElementById("architectureSlotRevise"),
  architecturePreviousBlock: document.getElementById("architecturePreviousBlock"),
  architecturePreviousSummary: document.getElementById("architecturePreviousSummary"),
  architecturePreviousFrame: document.getElementById("architecturePreviousFrame"),
  architectureCurrentTitle: document.getElementById("architectureCurrentTitle"),
  architectureHint: document.getElementById("architectureHint"),
  architectureSummary: document.getElementById("architectureSummary"),
  architectureFrame: document.getElementById("architectureFrame"),
  architectureConfirm: document.getElementById("architectureConfirm"),
  architectureRedesign: document.getElementById("architectureRedesign"),
  architectureRetry: document.getElementById("architectureRetry"),
  architectureOpenFullscreen: document.getElementById(
    "architectureOpenFullscreen",
  ),
  agentHint: document.getElementById("agentHint"),
  agentInstall: document.getElementById("agentInstall"),
  agentInstallTitle: document.getElementById("agentInstallTitle"),
  agentInstallCmd: document.getElementById("agentInstallCmd"),
  copyInstallCmd: document.getElementById("copyInstallCmd"),
  agentRedetect: document.getElementById("agentRedetect"),
  startCommand: document.getElementById("startCommand"),
  startCmdField: document.getElementById("startCmdField"),
  doDispatch: document.getElementById("doDispatch"),
  dispatchErr: document.getElementById("dispatchErr"),
  dispatchStatus: document.getElementById("dispatchStatus"),
  openDeliverables: document.getElementById("openDeliverables"),
  deliveryCockpit: document.getElementById("deliveryCockpit"),
  deliveryStages: document.getElementById("deliveryStages"),
  deliveryNextAction: document.getElementById("deliveryNextAction"),
  progressCol: document.querySelector(".progress-col"),
  progressEmpty: document.getElementById("progressEmpty"),
  runTimeline: document.getElementById("runTimeline"),
  previewPanel: document.getElementById("previewPanel"),
  previewHeading: document.getElementById("previewHeading"),
  previewService: document.getElementById("previewService"),
  previewServiceDot: document.getElementById("previewServiceDot"),
  previewServiceStatus: document.getElementById("previewServiceStatus"),
  previewStartService: document.getElementById("previewStartService"),
  previewLink: document.getElementById("previewLink"),
  previewDeploy: document.getElementById("previewDeploy"),
  deployPicker: document.getElementById("deployPicker"),
  deployPickerTitle: document.getElementById("deployPickerTitle"),
  deployPickerList: document.getElementById("deployPickerList"),
  deployPickerBackdrop: document.getElementById("deployPickerBackdrop"),
  deployPickerCancel: document.getElementById("deployPickerCancel"),
  deployPickerConfirm: document.getElementById("deployPickerConfirm"),
  previewOpenFolder: document.getElementById("previewOpenFolder"),
  previewMissing: document.getElementById("previewMissing"),
  previewMeta: document.getElementById("previewMeta"),
  previewVersions: document.getElementById("previewVersions"),
  progressResult: document.getElementById("progressResult"),
  progressPreviewLink: document.getElementById("progressPreviewLink"),
  progressOpenFolder: document.getElementById("progressOpenFolder"),
  progressResultMeta: document.getElementById("progressResultMeta"),
  revisePanel: document.getElementById("revisePanel"),
  reviseTitle: document.getElementById("reviseTitle"),
  reviseVersions: document.getElementById("reviseVersions"),
  reviseVersionList: document.getElementById("reviseVersionList"),
  reviseHint: document.getElementById("reviseHint"),
  reviseCardFields: document.getElementById("reviseCardFields"),
  startReviseChat: document.getElementById("startReviseChat"),
  startReviseChatAlt: document.getElementById("startReviseChatAlt"),
  doReviseDispatch: document.getElementById("doReviseDispatch"),
  reviseErr: document.getElementById("reviseErr"),
  revGoal: document.getElementById("revGoal"),
  revOut: document.getElementById("revOut"),
  revAccept: document.getElementById("revAccept"),
  revAssume: document.getElementById("revAssume"),
  revGoalView: document.getElementById("revGoalView"),
  revOutView: document.getElementById("revOutView"),
  revAcceptView: document.getElementById("revAcceptView"),
  revAssumeView: document.getElementById("revAssumeView"),
  cardMark: document.getElementById("cardMark"),
  cardTitle: document.getElementById("cardTitle"),
  startBugFix: document.getElementById("startBugFix"),
  startBugFixEarly: document.getElementById("startBugFixEarly"),
  startBugFixAlt: document.getElementById("startBugFixAlt"),
  bugHotfix: document.getElementById("bugHotfix"),
  bugHotfixRow: document.getElementById("bugHotfixRow"),
  deskBottomActions: document.getElementById("deskBottomActions"),
  moduleTabs: document.getElementById("moduleTabs"),
  moduleMeta: document.getElementById("moduleMeta"),
  workerCountList: document.getElementById("workerCountList"),
  workerRecommendHint: document.getElementById("workerRecommendHint"),
  confirmWorkersGraph: document.getElementById("confirmWorkersGraph"),
  redecomposeTasks: document.getElementById("redecomposeTasks"),
  taskPoolPreview: document.getElementById("taskPoolPreview"),
  taskPoolList: document.getElementById("taskPoolList"),
  taskPoolEmpty: document.getElementById("taskPoolEmpty"),
  dispatchCenterToggle: document.getElementById("dispatchCenterToggle"),
  openTaskGraph: document.getElementById("openTaskGraph"),
  lblGoal: document.getElementById("lblGoal"),
  lblOut: document.getElementById("lblOut"),
  lblAccept: document.getElementById("lblAccept"),
  acceptHint: document.getElementById("acceptHint"),
  lblAssume: document.getElementById("lblAssume"),
  chatPanel: document.querySelector(".chat-panel"),
  cardPanel: document.querySelector(".card-panel"),
  updateNotice: document.getElementById("updateNotice"),
  langSelect: document.getElementById("langSelect"),
  themeToggle: document.getElementById("themeToggle"),
  themeToggleLabel: document.getElementById("themeToggleLabel"),
  historyToggle: document.getElementById("historyToggle"),
  employeeToggle: document.getElementById("employeeToggle"),
  employeePanel: document.getElementById("employeePanel"),
  employeeClose: document.getElementById("employeeClose"),
  employeeList: document.getElementById("employeeList"),
  /** Same node as historyToggle — label shows the active project. */
  projectBadge: document.getElementById("historyToggle"),
  historyPanel: document.getElementById("historyPanel"),
  historyBackdrop: document.getElementById("historyBackdrop"),
  historyClose: document.getElementById("historyClose"),
  historyList: document.getElementById("historyList"),
  historyErr: document.getElementById("historyErr"),
  historyDetail: document.getElementById("historyDetail"),
  historyDetailGoal: document.getElementById("historyDetailGoal"),
  historyDetailMeta: document.getElementById("historyDetailMeta"),
  historyDetailBody: document.getElementById("historyDetailBody"),
  historyRestore: document.getElementById("historyRestore"),
};

function providerLabel(p) {
  return p?.id === "custom" ? t("provider.custom") : p?.label || "";
}

/** Pick the column section the user should see for the current stage. */
function activeRightFocusEl() {
  if (
    el.revisePanel &&
    !el.revisePanel.hidden &&
    (state.mode === "revise" || state.reviseLocked || state.reviseDispatching)
  ) {
    if (el.doReviseDispatch && !el.doReviseDispatch.hidden) {
      return el.doReviseDispatch;
    }
    return el.revisePanel;
  }
  if (el.previewPanel && !el.previewPanel.hidden) {
    if (el.startReviseChat && !el.startReviseChat.hidden) {
      return el.startReviseChat;
    }
    return el.previewPanel;
  }
  if (el.dispatch && !el.dispatch.hidden) {
    return el.dispatch;
  }
  return el.confirm || el.cardPanel;
}

function activeProgressFocusEl() {
  if (state.activeRun?.root?.isConnected) return state.activeRun.root;
  if (el.runTimeline && !el.runTimeline.hidden) return el.runTimeline;
  return el.progressCol;
}

let rightFocusTimer = 0;
/** After the user scrolls a desk column, skip auto-focus until this time. */
const USER_SCROLL_HOLD_MS = 12_000;
const panelScrollHoldUntil = new WeakMap();
const panelProgramScroll = new WeakMap();

function markPanelUserScroll(panel) {
  if (!panel) return;
  panelScrollHoldUntil.set(panel, Date.now() + USER_SCROLL_HOLD_MS);
}

function clearPanelUserScroll(panel) {
  if (!panel) return;
  panelScrollHoldUntil.delete(panel);
}

function panelHasRecentUserScroll(panel) {
  return Date.now() < (panelScrollHoldUntil.get(panel) || 0);
}

function wirePanelScrollHold(panel) {
  if (!panel || panel.dataset.scrollHoldBound === "1") return;
  panel.dataset.scrollHoldBound = "1";
  const noteUser = () => {
    if (panelProgramScroll.get(panel)) return;
    markPanelUserScroll(panel);
  };
  panel.addEventListener("wheel", noteUser, { passive: true });
  panel.addEventListener("touchstart", noteUser, { passive: true });
  panel.addEventListener(
    "scroll",
    () => {
      if (panelProgramScroll.get(panel)) return;
      markPanelUserScroll(panel);
    },
    { passive: true },
  );
}

function scrollPanelToTarget(panel, target, { smooth = true, force = false } = {}) {
  if (!panel || !target || panel.hidden || !target.isConnected) return;
  wirePanelScrollHold(panel);
  if (!force && panelHasRecentUserScroll(panel)) return;
  try {
    const panelRect = panel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const pad = 16;
    const above = targetRect.top < panelRect.top + pad;
    const below = targetRect.bottom > panelRect.bottom - pad;
    if (!force && !above && !below) return;
    const nextTop = panel.scrollTop + (targetRect.top - panelRect.top) - pad;
    panelProgramScroll.set(panel, true);
    panel.scrollTo({
      top: Math.max(0, nextTop),
      behavior: smooth ? "smooth" : "auto",
    });
    window.setTimeout(
      () => panelProgramScroll.delete(panel),
      smooth ? 450 : 80,
    );
  } catch {
    target.scrollIntoView({
      block: "nearest",
      behavior: smooth ? "smooth" : "auto",
    });
  }
}

/** Scroll requirements and/or progress columns to the active stage. */
function focusRightPanel({ smooth = true, force = false } = {}) {
  if (force) {
    clearPanelUserScroll(el.cardPanel);
    clearPanelUserScroll(el.progressCol);
  }
  const cardTarget = activeRightFocusEl();
  const progressTarget = activeProgressFocusEl();
  const run = () => {
    scrollPanelToTarget(el.cardPanel, cardTarget, { smooth, force });
    if (state.activeRun || (el.runTimeline && !el.runTimeline.hidden)) {
      scrollPanelToTarget(el.progressCol, progressTarget, { smooth, force });
    }
  };
  clearTimeout(rightFocusTimer);
  rightFocusTimer = window.setTimeout(run, force ? 0 : 40);
}

function scrollChatToLatest() {
  if (!el.log) return;
  el.log.scrollTop = el.log.scrollHeight;
}

function setChatQuickNavOpen(open) {
  if (!el.chatQuickNav || !el.chatQuickNavMenu) return;
  el.chatQuickNav.setAttribute("aria-expanded", open ? "true" : "false");
  el.chatQuickNavMenu.hidden = !open;
}

function quickNavTarget(kind) {
  if (kind === "chat") return el.log;
  if (kind === "card") {
    if (el.revisePanel && !el.revisePanel.hidden) return el.revisePanel;
    return el.confirm || el.cardPanel;
  }
  if (kind === "result") {
    if (el.previewPanel && !el.previewPanel.hidden) return el.previewPanel;
    if (el.revisePanel && !el.revisePanel.hidden) return el.revisePanel;
    return el.confirm || el.cardPanel;
  }
  if (kind === "progress") {
    return activeProgressFocusEl() || el.progressCol;
  }
  return null;
}

function jumpQuickNav(kind) {
  setChatQuickNavOpen(false);
  if (kind === "chat") {
    clearPanelUserScroll(el.log);
    scrollChatToLatest();
    return;
  }
  const target = quickNavTarget(kind);
  if (!target) return;
  if (kind === "progress") {
    clearPanelUserScroll(el.progressCol);
    scrollPanelToTarget(el.progressCol, target, { smooth: true, force: true });
    return;
  }
  clearPanelUserScroll(el.cardPanel);
  scrollPanelToTarget(el.cardPanel, target, { smooth: true, force: true });
}

function wireChatQuickNav() {
  if (!el.chatQuickNav || el.chatQuickNav.dataset.bound === "1") return;
  el.chatQuickNav.dataset.bound = "1";
  el.chatQuickNav.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const open = el.chatQuickNav.getAttribute("aria-expanded") !== "true";
    setChatQuickNavOpen(open);
  });
  el.chatQuickNavMenu?.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("[data-nav]");
    if (!btn) return;
    ev.preventDefault();
    jumpQuickNav(btn.getAttribute("data-nav"));
  });
  document.addEventListener("click", (ev) => {
    if (!el.chatQuickNavWrap?.contains(ev.target)) setChatQuickNavOpen(false);
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") setChatQuickNavOpen(false);
  });
}

function syncChatPlaceholder() {
  if (!el.input) return;
  el.input.placeholder =
    state.mode === "revise"
      ? t("chat.revisePlaceholder")
      : state.mode === "architecture"
        ? t("chat.archPlaceholder")
        : t("chat.placeholder");
}

/** Soft busy timeout — hung streams should not block Send forever. */
const BUSY_STALE_MS = 90_000;

function setBusy(on) {
  state.busy = Boolean(on);
  state.busySince = state.busy ? Date.now() : 0;
  syncComposerEnabled();
  // Only flip disabled flags — never rebuild accordion / architecture panel
  // here (that raced revise kickoff and could re-enter heavy IR work).
  try {
    if (el.confirm) {
      if (state.busy) {
        el.confirm.disabled = true;
      } else {
        // Recompute from rules — do not latch busy||previousDisabled forever.
        refreshConfirmButtonOnly();
      }
    }
    if (el.doReviseDispatch && state.mode === "revise") {
      if (state.busy) {
        el.doReviseDispatch.disabled = true;
      } else {
        el.doReviseDispatch.disabled =
          state.reviseDispatching ||
          state.revisePlanConfirmed ||
          el.doReviseDispatch.disabled;
      }
    }
    if (el.architectureConfirm) {
      const a = state.architecture;
      const canConfirm = a.status === "preview" && a.url && !a.confirmed;
      el.architectureConfirm.disabled = !canConfirm || state.busy;
    }
  } catch {
    /* ignore */
  }
}

/** Flip revise dispatch disabled without accordion / field chrome rebuild. */
function setReviseDispatchBusy(busy) {
  if (!el.doReviseDispatch) return;
  try {
    el.doReviseDispatch.disabled =
      Boolean(busy) ||
      state.reviseDispatching ||
      state.revisePlanConfirmed ||
      !state.ready;
  } catch {
    /* ignore */
  }
}

function maybeClearStaleBusy() {
  if (!state.busy || !state.busySince) return false;
  if (Date.now() - state.busySince < BUSY_STALE_MS) return false;
  setBusy(false);
  syncConfirmEnabled();
  return true;
}

/**
 * Chat may run whenever the desk is ready and not mid-request.
 * Locked Briefs no longer hard-block send (card writes are skipped instead).
 */
function chatAllowed() {
  maybeClearStaleBusy();
  return Boolean(
    state.ready &&
      state.projectPath &&
      !state.busy &&
      !state.reviseDispatching,
  );
}

function chatBlockReason() {
  if (!state.ready) return t("bot.chatNotReady");
  if (!state.projectPath) return t("bot.needProject");
  if (state.reviseDispatching) return t("bot.chatReviseBusy");
  if (state.busy) return t("bot.chatBusy");
  return "";
}

function syncComposerEnabled() {
  const ok = chatAllowed();
  if (el.send) el.send.disabled = !ok;
  if (el.voice) {
    const voiceOk = Boolean(state.ready && state.projectPath && !state.busy);
    el.voice.disabled = !voiceOk;
    if (!voiceOk) stopVoiceInput({ keepLabel: true });
  }
  if (el.input) el.input.disabled = !state.ready || !state.projectPath;
  syncChatPlaceholder();
  syncProjectGateHint();
  syncProjectBadge();
}

function syncProjectBadge() {
  const btn = el.historyToggle || el.projectBadge;
  if (!btn) return;
  if (state.projectPath) {
    btn.textContent = t("project.activeBadge", {
      name: state.projectName || state.projectPath,
    });
    btn.classList.add("is-active");
    btn.classList.remove("is-empty");
  } else {
    btn.textContent = t("project.noneBadge");
    btn.classList.add("is-empty");
    btn.classList.remove("is-active");
  }
}

function syncProjectGateHint() {
  if (!el.projectGateHint) return;
  el.projectGateHint.hidden = Boolean(state.projectPath);
  el.projectGateHint.textContent = t("project.gateHint");
}

function setActiveProject(path, name, description) {
  const abs = String(path || "").trim();
  state.projectPath = abs || null;
  state.projectName = name || (abs ? abs.split(/[\\/]/).pop() : null);
  state.projectDescription = description || null;
  if (el.repoPath && abs) el.repoPath.value = abs;
  syncDispatchProjectLine();
  syncDeliverablesEntry();
  syncComposerEnabled();
}

function syncDeliverablesEntry() {
  if (!el.openDeliverables) return;
  el.openDeliverables.hidden = !state.projectPath;
  paintDeliveryCockpit();
}

function deskSessionSnapshot() {
  return {
    modules: state.modules || [],
    architecture: state.architecture || {},
    jobId: state.jobId || null,
    reviseCards: state.reviseCards || [],
    reviseLocked: Boolean(state.reviseLocked),
    revisePlanConfirmed: Boolean(state.revisePlanConfirmed),
    lastRevision: state.lastRevision || null,
    originalCard: state.originalCard || null,
  };
}

function paintDeliveryCockpit(statusHint = null) {
  if (!el.deliveryCockpit) return;
  if (!state.projectPath) {
    el.deliveryCockpit.hidden = true;
    return;
  }
  const hint =
    statusHint && typeof statusHint === "object" ? statusHint : {};
  const progress = hint.progress;
  const derived = deriveProjectDeliveryStatus(deskSessionSnapshot(), {
    jobStatus: hint.status || hint.jobStatus || null,
    deliveryAccepted:
      hint.delivery?.status === "accepted" ||
      String(hint.status || "").toLowerCase() === "accepted",
    progressDone: progress?.done,
    progressTotal: progress?.total,
  });
  el.deliveryCockpit.hidden = false;
  if (el.deliveryStages) {
    el.deliveryStages.replaceChildren();
    for (const st of stageTone(derived.stages)) {
      const li = document.createElement("li");
      li.className = `delivery-stage is-${st.tone}`;
      li.dataset.stage = st.id;
      li.textContent = t(`cockpit.stage.${st.id}`);
      el.deliveryStages.appendChild(li);
    }
  }
  if (el.deliveryNextAction) {
    el.deliveryNextAction.textContent = t(`cockpit.next.${derived.nextAction}`);
  }
}

function openDeliverablesPage() {
  const abs = String(state.projectPath || "").trim();
  if (!abs) {
    addBubble("bot", t("bot.needProject"));
    return;
  }
  const lang = deliverablesLang();
  const url = `/api/projects/deliverables?path=${encodeURIComponent(abs)}&lang=${lang}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function syncDispatchProjectLine() {
  const has = Boolean(state.projectPath);
  if (el.dispatchProjectSummary) {
    el.dispatchProjectSummary.hidden = !has;
  }
  if (el.dispatchProjectLine) {
    el.dispatchProjectLine.textContent = has
      ? t("dispatch.projectSummary", {
          name: state.projectName || state.projectPath,
        })
      : "";
  }
  if (el.dispatchProjectPath) {
    el.dispatchProjectPath.textContent = has ? state.projectPath : "";
    el.dispatchProjectPath.hidden = !has;
  }
  // Project already chosen earlier — do not re-show browse / path pickers.
  if (el.repoPickBlock) el.repoPickBlock.hidden = has;
  if (el.repoPickActions) el.repoPickActions.hidden = has;
  if (el.repoFilterField) el.repoFilterField.hidden = has;
  if (el.repoList) el.repoList.hidden = has;
}

function explainChatBlocked() {
  const msg = chatBlockReason();
  if (!msg) return;
  if (state.lastChatBlockMsg === msg) return;
  state.lastChatBlockMsg = msg;
  addBubble("bot", msg);
}

function syncThemeToggleUi() {
  const theme = getTheme();
  if (el.themeToggle) {
    el.themeToggle.dataset.theme = theme;
    el.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    el.themeToggle.setAttribute("aria-label", t("theme.aria"));
  }
  if (el.themeToggleLabel) {
    el.themeToggleLabel.textContent =
      theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  }
}

function syncDynamicI18n() {
  syncThemeToggleUi();
  for (const p of state.providers) {
    if (p.id === "custom") p.label = t("provider.custom");
  }
  if (el.settingsPanel && !el.settingsPanel.hidden) {
    renderProviders();
    applyProvider(state.providerId, { fillEmptyOnly: true });
    if (el.cfgKey && state.lastCfg) {
      el.cfgKey.placeholder = state.lastCfg.hasApiKey
        ? t("setup.keySaved")
        : "sk-…";
    }
  }
  if (el.meta && state.lastCfg?.ready) {
    el.meta.textContent = t("meta.model", {
      model: state.lastCfg.model,
      jobs: state.lastCfg.jobsRoot || "~/.duaer/live/jobs",
    });
  }
  showUpdateNotice(state.lastUpdate);
  syncChatPlaceholder();
  syncReqSections();
  syncConfirmEnabled();
  syncComposerEnabled();
  if (el.agentList && !el.dispatch?.hidden) renderAgentList();
  if (el.deployTargetList && !el.dispatch?.hidden) renderDeployTargetList();
  if (el.repoList && !el.dispatch?.hidden) renderRepoList();
  if (el.doDispatch && !el.dispatch?.hidden) syncDispatchButton();
  if (el.copyInstallCmd && el.agentInstall && !el.agentInstall.hidden) {
    el.copyInstallCmd.textContent = t("dispatch.copyInstall");
  }
  if (el.agentRedetect) el.agentRedetect.textContent = t("dispatch.redetect");
  if (el.agentInstall && !el.agentInstall.hidden) syncInstallHint();
}

function showUpdateNotice(update) {
  if (!el.updateNotice) return;
  state.lastUpdate = update || null;
  if (!update?.outdated || !update.latest) {
    el.updateNotice.hidden = true;
    el.updateNotice.textContent = "";
    return;
  }
  const cur = update.current || "?";
  el.updateNotice.hidden = false;
  el.updateNotice.innerHTML = t("update.noticeHtml", {
    latest: escapeHtml(update.latest),
    current: escapeHtml(cur),
  });
}

function cardValues() {
  return {
    goal: (el.goal?.value || "").trim(),
    outOfScope: (el.outOfScope?.value || "").trim(),
    acceptance: (el.acceptance?.value || "").trim(),
    assumptions: (el.assumptions?.value || "").trim(),
    deviceMatrix: (el.deviceMatrix?.value || "").trim(),
    criticalPaths: (el.criticalPaths?.value || "").trim(),
    exceptionCases: (el.exceptionCases?.value || "").trim(),
    apiContract: (el.apiContract?.value || "").trim(),
    envChecklist: (el.envChecklist?.value || "").trim(),
    dataPrecheck: (el.dataPrecheck?.value || "").trim(),
    externalDeps: (el.externalDeps?.value || "").trim(),
    perfBudget: (el.perfBudget?.value || "").trim(),
  };
}

function ensureModulesSeed() {
  if (Array.isArray(state.modules) && state.modules.length) return;
  const c = cardValues();
  state.modules = [
    {
      id: "main",
      title: "Main",
      status: "draft",
      card: { ...c },
      dependsOn: [],
    },
  ];
  state.activeModuleId = "main";
}

function activeModule() {
  ensureModulesSeed();
  const id = state.activeModuleId || state.modules[0]?.id;
  return state.modules.find((m) => m.id === id) || state.modules[0] || null;
}

function modulesAllConfirmedLocal() {
  return (
    Array.isArray(state.modules) &&
    state.modules.length > 0 &&
    state.modules.every((m) => m.status === "confirmed")
  );
}

function syncActiveModuleCardFromFields() {
  const m = activeModule();
  if (!m || m.status === "confirmed") return;
  m.card = cardValues();
}

function applyActiveModuleToFields() {
  const m = activeModule();
  const c = m?.card || {};
  if (el.goal) el.goal.value = c.goal || "";
  if (el.outOfScope) el.outOfScope.value = c.outOfScope || "";
  if (el.acceptance) el.acceptance.value = c.acceptance || "";
  if (el.assumptions) el.assumptions.value = c.assumptions || "";
  if (el.deviceMatrix) el.deviceMatrix.value = c.deviceMatrix || "";
  if (el.criticalPaths) el.criticalPaths.value = c.criticalPaths || "";
  if (el.exceptionCases) el.exceptionCases.value = c.exceptionCases || "";
  if (el.apiContract) el.apiContract.value = c.apiContract || "";
  if (el.envChecklist) el.envChecklist.value = c.envChecklist || "";
  if (el.dataPrecheck) el.dataPrecheck.value = c.dataPrecheck || "";
  if (el.externalDeps) el.externalDeps.value = c.externalDeps || "";
  if (el.perfBudget) el.perfBudget.value = c.perfBudget || "";
  syncReqSections();
}

function statusLabel(status) {
  if (status === "confirmed") return t("card.moduleConfirmed");
  if (status === "ready") return t("card.moduleReady");
  return t("card.moduleDraft");
}

function renderModuleTabs() {
  if (!el.moduleTabs) return;
  ensureModulesSeed();
  const list = state.modules;
  el.moduleTabs.hidden = state.deskKind === "bug" || list.length < 1;
  el.moduleTabs.replaceChildren();
  for (const m of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "module-tab";
    btn.setAttribute("role", "tab");
    btn.dataset.moduleId = m.id;
    const active = m.id === (state.activeModuleId || list[0]?.id);
    btn.setAttribute("aria-selected", active ? "true" : "false");
    if (active) btn.classList.add("is-active");
    if (m.status === "confirmed") btn.classList.add("is-confirmed");
    btn.textContent = `${m.title} · ${statusLabel(m.status)}`;
    btn.addEventListener("click", () => {
      if (m.id === state.activeModuleId) return;
      syncActiveModuleCardFromFields();
      state.activeModuleId = m.id;
      applyActiveModuleToFields();
      resetValidateGate();
      setConfirmFieldsReadonly(
        m.status === "confirmed" || modulesAllConfirmedLocal(),
      );
      renderModuleTabs();
      syncConfirmEnabled();
      if (
        m.status !== "confirmed" &&
        !modulesAllConfirmedLocal() &&
        state.mode !== "revise"
      ) {
        scheduleValidate("confirm");
      }
      schedulePersistProjectDesk();
    });
    el.moduleTabs.appendChild(btn);
  }
  if (el.moduleMeta) {
    const done = list.filter((m) => m.status === "confirmed").length;
    el.moduleMeta.hidden = list.length < 1;
    el.moduleMeta.textContent = t("card.modulesProgress", {
      done: String(done),
      total: String(list.length),
    });
  }
  paintDeliveryCockpit();
}

function mergeModulesFromChatPayload(data) {
  ensureModulesSeed();
  if (state.deskKind === "bug") {
    const card = {
      goal: String(data.goal || data.modules?.[0]?.goal || data.modules?.[0]?.card?.goal || activeModule()?.card?.goal || ""),
      outOfScope: String(data.outOfScope || data.modules?.[0]?.outOfScope || data.modules?.[0]?.card?.outOfScope || activeModule()?.card?.outOfScope || ""),
      acceptance: String(data.acceptance || data.modules?.[0]?.acceptance || data.modules?.[0]?.card?.acceptance || activeModule()?.card?.acceptance || ""),
      assumptions: String(data.assumptions || data.modules?.[0]?.assumptions || data.modules?.[0]?.card?.assumptions || activeModule()?.card?.assumptions || ""),
      deviceMatrix: String(data.deviceMatrix || data.modules?.[0]?.card?.deviceMatrix || activeModule()?.card?.deviceMatrix || ""),
      criticalPaths: String(data.criticalPaths || data.modules?.[0]?.card?.criticalPaths || activeModule()?.card?.criticalPaths || ""),
      exceptionCases: String(data.exceptionCases || data.modules?.[0]?.card?.exceptionCases || activeModule()?.card?.exceptionCases || ""),
      apiContract: String(data.apiContract || data.modules?.[0]?.card?.apiContract || activeModule()?.card?.apiContract || ""),
      envChecklist: String(data.envChecklist || data.modules?.[0]?.card?.envChecklist || activeModule()?.card?.envChecklist || ""),
      dataPrecheck: String(data.dataPrecheck || data.modules?.[0]?.card?.dataPrecheck || activeModule()?.card?.dataPrecheck || ""),
      externalDeps: String(data.externalDeps || data.modules?.[0]?.card?.externalDeps || activeModule()?.card?.externalDeps || ""),
      perfBudget: String(data.perfBudget || data.modules?.[0]?.card?.perfBudget || activeModule()?.card?.perfBudget || ""),
    };
    const prev = activeModule();
    state.modules = [
      {
        id: "bug",
        title: t("card.bugModuleTitle"),
        status: prev?.status === "confirmed" ? "confirmed" : "draft",
        card: prev?.status === "confirmed" ? prev.card : card,
        dependsOn: [],
      },
    ];
    state.activeModuleId = "bug";
    if (prev?.status !== "confirmed") applyActiveModuleToFields();
    renderModuleTabs();
    return;
  }
  const incoming = Array.isArray(data.modules) ? data.modules : null;
  if (incoming && incoming.length) {
    const byId = new Map(state.modules.map((m) => [m.id, m]));
    for (const raw of incoming) {
      const id = String(raw.id || raw.title || "").trim().slice(0, 80);
      if (!id) continue;
      const old = byId.get(id);
      const card = {
        goal: String(raw.goal || raw.card?.goal || old?.card?.goal || ""),
        outOfScope: String(
          raw.outOfScope || raw.card?.outOfScope || old?.card?.outOfScope || "",
        ),
        acceptance: String(
          raw.acceptance || raw.card?.acceptance || old?.card?.acceptance || "",
        ),
        assumptions: String(
          raw.assumptions ||
            raw.card?.assumptions ||
            old?.card?.assumptions ||
            "",
        ),
        deviceMatrix: String(
          raw.deviceMatrix ||
            raw.card?.deviceMatrix ||
            old?.card?.deviceMatrix ||
            "",
        ),
        criticalPaths: String(
          raw.criticalPaths ||
            raw.card?.criticalPaths ||
            old?.card?.criticalPaths ||
            "",
        ),
        exceptionCases: String(
          raw.exceptionCases ||
            raw.card?.exceptionCases ||
            old?.card?.exceptionCases ||
            "",
        ),
        apiContract: String(
          raw.apiContract ||
            raw.card?.apiContract ||
            old?.card?.apiContract ||
            "",
        ),
        envChecklist: String(
          raw.envChecklist ||
            raw.card?.envChecklist ||
            old?.card?.envChecklist ||
            "",
        ),
        dataPrecheck: String(
          raw.dataPrecheck ||
            raw.card?.dataPrecheck ||
            old?.card?.dataPrecheck ||
            "",
        ),
        externalDeps: String(
          raw.externalDeps ||
            raw.card?.externalDeps ||
            old?.card?.externalDeps ||
            "",
        ),
        perfBudget: String(
          raw.perfBudget ||
            raw.card?.perfBudget ||
            old?.card?.perfBudget ||
            "",
        ),
      };
      if (old?.status === "confirmed") {
        byId.set(id, {
          ...old,
          title: String(raw.title || old.title || id).slice(0, 120),
        });
      } else {
        byId.set(id, {
          id,
          title: String(raw.title || id).slice(0, 120),
          status: old?.status === "confirmed" ? "confirmed" : "draft",
          card,
          dependsOn: Array.isArray(raw.dependsOn)
            ? raw.dependsOn.map(String)
            : old?.dependsOn || [],
        });
      }
    }
    state.modules = [...byId.values()];
  }
  if (data.activeModuleId) {
    const want = String(data.activeModuleId).trim();
    if (state.modules.some((m) => m.id === want)) {
      state.activeModuleId = want;
    }
  }
  if (!state.activeModuleId) {
    state.activeModuleId = state.modules[0]?.id || "main";
  }
  // Patch active module fields from top-level card keys
  const m = activeModule();
  if (m && m.status !== "confirmed") {
    if (data.goal) m.card.goal = data.goal;
    if (data.outOfScope) m.card.outOfScope = data.outOfScope;
    if (data.acceptance) m.card.acceptance = data.acceptance;
    if (data.assumptions) m.card.assumptions = data.assumptions;
    if (data.deviceMatrix) m.card.deviceMatrix = data.deviceMatrix;
    if (data.criticalPaths) m.card.criticalPaths = data.criticalPaths;
    if (data.exceptionCases) m.card.exceptionCases = data.exceptionCases;
    if (data.apiContract) m.card.apiContract = data.apiContract;
    if (data.envChecklist) m.card.envChecklist = data.envChecklist;
    if (data.dataPrecheck) m.card.dataPrecheck = data.dataPrecheck;
    if (data.externalDeps) m.card.externalDeps = data.externalDeps;
    if (data.perfBudget) m.card.perfBudget = data.perfBudget;
    if (data.ready) m.status = "ready";
  }
  applyActiveModuleToFields();
  renderModuleTabs();
}

function previewTaskPoolLines(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  return list.map((t) => {
    const deps =
      t.dependsOn?.length > 0 ? ` ← ${t.dependsOn.join(", ")}` : "";
    const wid = t.workerId ? ` · ${t.workerId}` : "";
    const mod = t.moduleId ? ` [${t.moduleId}]` : "";
    const par = t.parallel ? " ‖" : "";
    return `${t.id}${mod}${wid}${par} ${t.title}${deps}`;
  });
}

function renderTaskPoolList(tasks) {
  if (!el.taskPoolList) return;
  el.taskPoolList.replaceChildren();
  const list = annotateParallelTasks(tasks || []);
  if (el.taskPoolEmpty) el.taskPoolEmpty.hidden = list.length > 0;
  if (el.taskPoolPreview) el.taskPoolPreview.hidden = false;
  for (const tsk of list) {
    const li = document.createElement("li");
    li.className = "task-pool-item";
    li.setAttribute("role", "listitem");
    const id = document.createElement("span");
    id.className = "task-pool-id";
    id.textContent = tsk.id || "";
    li.appendChild(id);
    const title = document.createElement("span");
    title.className = "task-pool-title";
    title.textContent = tsk.title || "";
    li.appendChild(title);
    if (tsk.parallel) {
      const chip = document.createElement("span");
      chip.className = "task-pool-parallel";
      chip.textContent = t("dispatch.parallelChip");
      li.appendChild(chip);
    }
    if (tsk.dependsOn?.length) {
      const deps = document.createElement("span");
      deps.className = "task-pool-deps";
      deps.textContent = `← ${tsk.dependsOn.join(", ")}`;
      li.appendChild(deps);
    }
    if (tsk.workerId) {
      const wid = document.createElement("span");
      wid.className = "task-pool-deps";
      wid.textContent = tsk.workerId;
      li.appendChild(wid);
    }
    el.taskPoolList.appendChild(li);
  }
}

function syncConfirmWorkersGraphButton() {
  const btn = el.confirmWorkersGraph;
  if (!btn) return;
  const busy = Boolean(state.dispatchGraphBuilding);
  const locked = Boolean(state.dispatchGraphReady);
  const regen =
    !locked &&
    !busy &&
    Boolean(state.dispatchGraphBuiltOnce);
  btn.disabled = busy || locked;
  btn.setAttribute("aria-busy", busy ? "true" : "false");
  btn.classList.toggle("is-busy", busy);
  btn.classList.toggle("is-locked", locked && !busy);
  btn.classList.toggle("is-regen", regen);
  if (busy) {
    btn.textContent = t("dispatch.graphBuilding");
  } else if (locked) {
    btn.textContent = t("dispatch.confirmWorkersLocked");
  } else if (regen) {
    btn.textContent = t("dispatch.regenWorkersGraph");
  } else {
    btn.textContent = t("dispatch.confirmWorkersGraph");
  }
}

function syncOpenTaskGraphButton() {
  if (el.openTaskGraph) {
    el.openTaskGraph.disabled = !state.dispatchGraphReady;
  }
  syncConfirmWorkersGraphButton();
}

/**
 * Drop the current 派工图 so the operator must confirm+build again.
 * @param {{ silent?: boolean, hidePanel?: boolean }} [opts]
 */
function clearDispatchGraphState(opts = {}) {
  const silent = Boolean(opts.silent);
  const hidePanel = Boolean(opts.hidePanel);
  state.dispatchGraphReady = false;
  state.dispatchGraphBuilding = false;
  state.dispatchGraphUrl = null;
  if (hidePanel && el.dispatch) el.dispatch.hidden = true;
  syncOpenTaskGraphButton();
  renderWorkerCountList();
  if (!silent && el.dispatchErr && state.dispatchGraphBuiltOnce) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("dispatch.graphStale");
  }
  schedulePersistProjectDesk();
}

/**
 * Start a new kickoff wave: fresh task pool + new 派工图 required.
 * @param {{ hidePanel?: boolean, silent?: boolean }} [opts]
 */
function resetDispatchGraphForNewWave(opts = {}) {
  state.taskPool = null;
  if (el.taskPoolList) el.taskPoolList.replaceChildren();
  if (el.taskPoolEmpty) el.taskPoolEmpty.hidden = false;
  clearDispatchGraphState({
    silent: opts.silent !== false,
    hidePanel: Boolean(opts.hidePanel),
  });
}

function markDispatchGraphStale() {
  if (!state.dispatchGraphReady && !state.dispatchGraphUrl) {
    syncOpenTaskGraphButton();
    renderWorkerCountList();
    return;
  }
  clearDispatchGraphState({ silent: false, hidePanel: false });
}

function applyRecommendedWorkerCount(tasks) {
  const rec = recommendWorkerCount(tasks, { max: 4 });
  state.recommendedWorkerCount = rec;
  state.workerCount = rec;
  if (el.workerRecommendHint) {
    el.workerRecommendHint.hidden = false;
    el.workerRecommendHint.textContent = t("dispatch.recommendWorkers", {
      n: String(rec),
    });
  }
}

function renderWorkerCountList() {
  if (!el.workerCountList) return;
  el.workerCountList.replaceChildren();
  const cur = Math.max(1, Math.min(4, Number(state.workerCount) || 1));
  state.workerCount = cur;
  const chipsLocked =
    Boolean(state.dispatchGraphReady) || Boolean(state.dispatchGraphBuilding);
  for (let n = 1; n <= 4; n += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "worker-count-chip";
    b.setAttribute("aria-pressed", n === cur ? "true" : "false");
    b.setAttribute("aria-label", String(n));
    b.disabled = chipsLocked;
    const num = document.createElement("span");
    num.textContent = String(n);
    b.appendChild(num);
    const sub = document.createElement("span");
    sub.className = "w-label";
    let label =
      n === 1 ? t("dispatch.workerSerial") : t("dispatch.workerParallel");
    if (n === state.recommendedWorkerCount) {
      label = `${label} · ★`;
    }
    sub.textContent = label;
    b.appendChild(sub);
    b.addEventListener("click", () => {
      if (chipsLocked) return;
      if (state.workerCount !== n) {
        state.workerCount = n;
        markDispatchGraphStale();
      }
      renderWorkerCountList();
    });
    el.workerCountList.appendChild(b);
  }
}

function decomposeTasksFromModules() {
  ensureModulesSeed();
  const confirmed = state.modules.filter((m) => m.status === "confirmed");
  if (!confirmed.length) {
    state.taskPool = null;
    renderTaskPoolList([]);
    return null;
  }
  const pool =
    state.deskKind === "bug"
      ? buildPreviewPoolForBug(confirmed)
      : buildPreviewPoolFromModules(confirmed);
  const annotated = annotateParallelTasks(pool.tasks);
  state.taskPool = { version: 1, tasks: annotated };
  applyRecommendedWorkerCount(annotated);
  renderWorkerCountList();
  renderTaskPoolList(annotated);
  clearDispatchGraphState({ silent: true, hidePanel: false });
  return state.taskPool;
}

function syncTaskPoolPreview() {
  void syncTaskPoolPreviewAsync();
}

async function syncTaskPoolPreviewAsync() {
  if (!el.taskPoolPreview) return;
  ensureModulesSeed();
  const confirmed = state.modules.filter((m) => m.status === "confirmed");
  if (!confirmed.length || !state.locked || !state.architecture?.confirmed) {
    if (el.taskPoolEmpty) el.taskPoolEmpty.hidden = false;
    renderTaskPoolList([]);
    state.taskPool = null;
    return;
  }
  if (state.taskPool?.tasks?.length) {
    renderTaskPoolList(state.taskPool.tasks);
    return;
  }
  decomposeTasksFromModules();
}

function setConfirmWorkersGraphBusy(busy) {
  state.dispatchGraphBuilding = Boolean(busy);
  syncConfirmWorkersGraphButton();
  renderWorkerCountList();
}

async function confirmWorkersAndBuildGraph() {
  if (state.dispatchGraphBuilding) return;
  if (state.dispatchGraphReady) return;
  ensureModulesSeed();
  if (!state.architecture?.confirmed) {
    if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = t("arch.needConfirm");
    }
    return;
  }
  if (!state.taskPool?.tasks?.length) {
    decomposeTasksFromModules();
  }
  if (!state.taskPool?.tasks?.length) {
    if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = t("dispatch.decomposeEmpty");
    }
    return;
  }
  const workerCount = Math.max(1, Math.min(4, Number(state.workerCount) || 1));
  state.workerCount = workerCount;
  const assigned = assignPreviewWorkers(state.taskPool, workerCount);
  state.taskPool = { version: 1, tasks: annotateParallelTasks(assigned.tasks) };
  renderTaskPoolList(state.taskPool.tasks);
  state.dispatchGraphReady = false;
  syncOpenTaskGraphButton();

  state.dispatchGraphBuilding = true;
  setConfirmWorkersGraphBusy(true);
  if (el.dispatchErr) el.dispatchErr.hidden = true;
  try {
    const ir = taskPoolToArchitectureIr(state.taskPool.tasks, {
      title: t("dispatch.taskGraph"),
      workerCount,
      locale: getLocale(),
      progress: state.lastJobProgress,
    });
    const res = await fetch("/api/architecture/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ir }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || t("dispatch.graphBuildFail"));
    }
    state.dispatchGraphUrl = String(data.url || "").trim() || null;
    state.dispatchGraphReady = true;
    state.dispatchGraphBuiltOnce = true;
    syncOpenTaskGraphButton();
    renderWorkerCountList();
    schedulePersistProjectDesk();
    addBubble("bot", t("dispatch.graphBuilt", { n: String(workerCount) }));
  } catch (err) {
    state.dispatchGraphReady = false;
    state.dispatchGraphUrl = null;
    syncOpenTaskGraphButton();
    renderWorkerCountList();
    const msg =
      err instanceof Error ? err.message : t("dispatch.graphBuildFail");
    if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = msg;
    }
    addBubble("bot", t("dispatch.graphBuildFailDetail", { msg }));
  } finally {
    state.dispatchGraphBuilding = false;
    setConfirmWorkersGraphBusy(false);
  }
}

async function refreshDispatchGraphWithProgress() {
  if (!state.taskPool?.tasks?.length) return null;
  const workerCount = Math.max(1, Math.min(4, Number(state.workerCount) || 1));
  const ir = taskPoolToArchitectureIr(state.taskPool.tasks, {
    title: t("dispatch.taskGraph"),
    workerCount,
    locale: getLocale(),
    progress: state.lastJobProgress,
  });
  const res = await fetch("/api/architecture/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ir }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || t("dispatch.graphBuildFail"));
  }
  state.dispatchGraphUrl = String(data.url || "").trim() || null;
  state.dispatchGraphReady = Boolean(state.dispatchGraphUrl);
  syncOpenTaskGraphButton();
  schedulePersistProjectDesk();
  return state.dispatchGraphUrl;
}

async function openDispatchGraphPresent() {
  if (!state.dispatchGraphReady && !state.taskPool?.tasks?.length) {
    if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = t("dispatch.needGraphConfirm");
    }
    return;
  }
  try {
    await refreshDispatchGraphWithProgress();
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : t("dispatch.graphBuildFail");
    if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = msg;
    }
    addBubble("bot", t("dispatch.graphBuildFailDetail", { msg }));
    return;
  }
  openDispatchCenterPage(state.projectPath);
}

function invalidateDispatchAfterArchChange() {
  clearDispatchGraphState({ silent: true, hidePanel: true });
}

function openDispatchCenterPage(projectPath) {
  const path = String(projectPath || state.projectPath || "").trim();
  const q = path ? `?path=${encodeURIComponent(path)}` : "";
  void openExternalDeskUrl(`/dispatch-center.html${q}`);
}

function reviseCardValues() {
  // When revising an active draft, prefer live field values. Do NOT call
  // stashReviseDraftFromFields here — that function spreads reviseCardValues()
  // and would recurse until Maximum call stack.
  if (state.mode === "revise" && !state.reviseLocked && state.reviseDraft) {
    const focus = Number(state.reviseCardFocus) || 0;
    const draftRev = Number(state.reviseDraft.revision) || 0;
    if (focus === draftRev) {
      return {
        goal: (el.revGoal?.value || "").trim(),
        outOfScope: (el.revOut?.value || "").trim(),
        acceptance: (el.revAccept?.value || "").trim(),
        assumptions: (el.revAssume?.value || "").trim(),
      };
    }
    return {
      goal: String(state.reviseDraft.goal || "").trim(),
      outOfScope: String(state.reviseDraft.outOfScope || "").trim(),
      acceptance: String(state.reviseDraft.acceptance || "").trim(),
      assumptions: String(state.reviseDraft.assumptions || "").trim(),
    };
  }
  return {
    goal: (el.revGoal?.value || "").trim(),
    outOfScope: (el.revOut?.value || "").trim(),
    acceptance: (el.revAccept?.value || "").trim(),
    assumptions: (el.revAssume?.value || "").trim(),
  };
}

function nextReviseRevisionNumber() {
  let max = 0;
  for (const entry of state.reviseCards || []) {
    const n = Number(entry?.revision) || 0;
    if (n > max) max = n;
  }
  const last = Number(state.lastRevision?.revision) || 0;
  if (last > max) max = last;
  if (state.reviseDraft) {
    const d = Number(state.reviseDraft.revision) || 0;
    if (d > max) return d;
  }
  return max + 1;
}

function getStoredReviseCard(revision) {
  const rev = Number(revision) || 0;
  return (state.reviseCards || []).find((e) => Number(e.revision) === rev) || null;
}

function upsertReviseCardEntry(revision, card, architecture = undefined) {
  const rev = Number(revision) || 0;
  if (rev < 1 || !card) return;
  const prev = getStoredReviseCard(rev);
  const entry = {
    revision: rev,
    goal: String(card.goal || ""),
    outOfScope: String(card.outOfScope || ""),
    acceptance: String(card.acceptance || ""),
    assumptions: String(card.assumptions || ""),
    at: prev?.at || new Date().toISOString(),
  };
  if (architecture !== undefined) {
    if (architecture) entry.architecture = architecture;
  } else if (prev?.architecture) {
    entry.architecture = prev.architecture;
  }
  const list = Array.isArray(state.reviseCards) ? [...state.reviseCards] : [];
  const idx = list.findIndex((e) => Number(e.revision) === rev);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  list.sort((a, b) => Number(a.revision) - Number(b.revision));
  state.reviseCards = list;
}

function appendBugCardEntry(card) {
  if (!card) return;
  const list = Array.isArray(state.bugCards) ? [...state.bugCards] : [];
  const seq = list.length + 1;
  list.push({
    id: `bug-${Date.now().toString(36)}-${seq}`,
    seq,
    goal: String(card.goal || ""),
    outOfScope: String(card.outOfScope || ""),
    acceptance: String(card.acceptance || ""),
    assumptions: String(card.assumptions || ""),
    at: new Date().toISOString(),
  });
  state.bugCards = list;
}

function architectureSnapshotFromState({ changed = false } = {}) {
  if (!state.architecture?.url) return null;
  return {
    url: state.architecture.url,
    ir: null,
    viewBox: state.architecture.viewBox || null,
    summary: state.architecture.summary || "",
    changed: Boolean(changed),
    fingerprint: architectureFpOf(state.architecture),
  };
}

function previousArchitectureFingerprint(beforeRevision) {
  const rev = Number(beforeRevision) || 0;
  if (rev <= 1) {
    return architectureFpOf(state.initialArchitecture);
  }
  const prev = getStoredReviseCard(rev - 1);
  return (
    architectureFpOf(prev?.architecture) ||
    architectureFpOf(state.initialArchitecture)
  );
}

function isReviseExpanded(key) {
  const k = String(key);
  if (Object.prototype.hasOwnProperty.call(state.reviseExpanded, k)) {
    return Boolean(state.reviseExpanded[k]);
  }
  return true; // default: all expanded
}

function setReviseExpanded(key, open) {
  state.reviseExpanded = {
    ...state.reviseExpanded,
    [String(key)]: Boolean(open),
  };
}

function escapeReviseText(s) {
  return escapeHtml(String(s || "").trim() || "—");
}

function renderReviseArchBlock(arch, { baseline = false } = {}) {
  if (!arch?.url) return "";
  if (!baseline && !arch.changed) return "";
  const url = String(arch.url || "").trim();
  const summary = arch.summary
    ? `<p class="revise-arch-summary">${escapeReviseText(arch.summary)}</p>`
    : "";
  const label = baseline ? t("revise.archBaseline") : t("revise.archChanged");
  return `<div class="revise-arch-block">
    <p class="revise-arch-label">${escapeHtml(label)}</p>
    ${summary}
    <div class="architecture-mount architecture-mount-clickable revise-arch-frame" data-arch-url="${escapeHtml(url)}" title="architecture"></div>
  </div>`;
}

/** Real FDE desk — never Cursor IDE Browser proxy origins (:64074, …). */
const DESK_ORIGIN = "http://127.0.0.1:8787";

/**
 * Rewrite relative / localhost desk URLs onto :8787 so open-external
 * does not reject Cursor proxy origins and fall back to window.open.
 */
function toDeskExternalHref(href) {
  const raw = String(href || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, DESK_ORIGIN);
    if (u.protocol !== "http:") return "";
    if (u.hostname !== "127.0.0.1" && u.hostname !== "localhost") return "";
    u.hostname = "127.0.0.1";
    u.port = "8787";
    return u.href;
  } catch {
    return "";
  }
}

function architecturePresentUrl(url, opts = {}) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, DESK_ORIGIN);
    u.searchParams.delete("embed");
    u.searchParams.set("present", "1");
    if (opts.noZoom) u.searchParams.set("noz", "1");
    else u.searchParams.delete("noz");
    return toDeskExternalHref(u.href) || u.href;
  } catch {
    const base = raw.split("#")[0];
    const join = base.includes("?") ? "&" : "?";
    const noz = opts.noZoom ? "&noz=1" : "";
    return toDeskExternalHref(`${base}${join}present=1${noz}`);
  }
}

/**
 * Open a desk URL in the OS browser via /api/open-external so Cursor IDE
 * Browser does not invent random high ports (:64074).
 */
async function openExternalDeskUrl(href) {
  const target = toDeskExternalHref(href);
  if (!target) return false;
  try {
    const res = await fetch("/api/open-external", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: target }),
    });
    if (res.ok) return true;
  } catch {
    /* fall through */
  }
  // Last resort: still prefer :8787 (OS may pick it up); avoid proxy origin.
  window.open(target, "_blank", "noopener");
  return false;
}

function openArchitecturePresent(url, opts = {}) {
  const href = architecturePresentUrl(url, opts);
  if (!href) return;
  void openExternalDeskUrl(href);
}

function bindArchitecturePresentClick(host, getUrl) {
  if (!host || host.dataset.presentBound === "1") return;
  host.dataset.presentBound = "1";
  host.classList.add("architecture-mount-clickable");
  // Capture on the host so Shadow DOM node clicks open fullscreen instead of
  // Archify reveal/zoom in the embed.
  host.addEventListener(
    "click",
    (ev) => {
      if (ev.target.closest?.("button, a, input, textarea, select")) return;
      const url = typeof getUrl === "function" ? getUrl() : getUrl;
      const href = String(url || host.dataset.archUrl || "").trim();
      if (!href) return;
      ev.preventDefault();
      ev.stopPropagation();
      openArchitecturePresent(href);
    },
    true,
  );
}

function hydrateArchitectureMounts(root) {
  const hosts = root?.querySelectorAll?.(".architecture-mount[data-arch-url]");
  if (!hosts?.length) return;
  for (const host of hosts) {
    const url = host.getAttribute("data-arch-url") || "";
    if (!url) continue;
    bindArchitecturePresentClick(host, () => host.getAttribute("data-arch-url"));
    mountArchitectureDiagram(host, { url }).catch(() => {
      clearArchitectureMount(host);
    });
  }
}

async function bindArchitectureMount(host, arch) {
  if (!host) return;
  if (!arch?.url) {
    clearArchitectureMount(host);
    return;
  }
  bindArchitecturePresentClick(host, () => arch.url || host.dataset.archUrl);
  const key = architectureKeyFromArchitectureUrl(arch.url);
  if (
    key &&
    host.dataset.archKey === key &&
    host.shadowRoot?.querySelector("svg")
  ) {
    host.hidden = false;
    return;
  }
  try {
    await mountArchitectureDiagram(host, {
      url: arch.url,
      ir: arch.ir || null,
    });
  } catch {
    clearArchitectureMount(host);
  }
}

function renderReviseVersionBody(card, { baselineArch = false } = {}) {
  const empty = "—";
  return `<dl class="revise-version-fields">
    <div><dt>${escapeHtml(t("revise.goal"))}</dt><dd class="req-structured">${structuredHtml(card.goal, empty)}</dd></div>
    <div><dt>${escapeHtml(t("revise.out"))}</dt><dd class="req-structured">${structuredHtml(card.outOfScope, empty)}</dd></div>
    <div><dt>${escapeHtml(t("revise.accept"))}</dt><dd class="req-structured">${structuredHtml(card.acceptance, empty)}</dd></div>
    <div><dt>${escapeHtml(t("revise.assume"))}</dt><dd class="req-structured">${structuredHtml(card.assumptions, empty)}</dd></div>
  </dl>${renderReviseArchBlock(card.architecture, { baseline: baselineArch })}`;
}

function reviseAccordionFingerprint() {
  return JSON.stringify({
    original: state.originalCard
      ? {
          g: state.originalCard.goal,
          o: state.originalCard.outOfScope,
          a: state.originalCard.acceptance,
          s: state.originalCard.assumptions,
        }
      : null,
    initArch: state.initialArchitecture?.url || "",
    cards: (state.reviseCards || []).map((e) => ({
      r: e.revision,
      g: e.goal,
      o: e.outOfScope,
      a: e.acceptance,
      s: e.assumptions,
      au: e.architecture?.url || "",
      ac: Boolean(e.architecture?.changed),
    })),
    expanded: state.reviseExpanded,
    locale: typeof getLocale === "function" ? getLocale() : "",
  });
}

function renderReviseVersionAccordion({ force = false } = {}) {
  if (!el.reviseVersionList) return;
  const fp = reviseAccordionFingerprint();
  if (!force && fp === state.reviseAccordionFp && el.reviseVersionList.childElementCount) {
    // Only refresh current highlight without destroying open details.
    const focus = String(
      Number(state.reviseCardFocus) ||
        Number(state.lastRevision?.revision) ||
        "",
    );
    for (const d of el.reviseVersionList.querySelectorAll(".revise-version-item")) {
      d.classList.toggle("is-current", d.dataset.revKey === focus);
    }
    return;
  }
  state.reviseAccordionFp = fp;
  el.reviseVersionList.replaceChildren();
  const items = [];

  if (state.originalCard && (state.originalCard.goal || state.originalCard.acceptance)) {
    items.push({
      key: "0",
      title: t("revise.versionInitial"),
      card: {
        ...state.originalCard,
        architecture: state.initialArchitecture || null,
      },
      baselineArch: true,
    });
  }

  for (const entry of state.reviseCards || []) {
    items.push({
      key: String(entry.revision),
      title: t("revise.versionReq", { revision: entry.revision }),
      card: entry,
    });
  }

  if (!items.length) {
    el.reviseVersionList.hidden = true;
    return;
  }
  el.reviseVersionList.hidden = false;

  const focus = String(
    Number(state.reviseCardFocus) || Number(state.lastRevision?.revision) || "",
  );

  for (const item of items) {
    const details = document.createElement("details");
    details.className = "revise-version-item";
    if (item.key === focus) details.classList.add("is-current");
    details.open = isReviseExpanded(item.key);
    details.dataset.revKey = item.key;
    details.addEventListener("toggle", () => {
      setReviseExpanded(item.key, details.open);
      schedulePersistProjectDesk();
    });

    const summary = document.createElement("summary");
    summary.className = "revise-version-summary";
    summary.textContent = item.title;
    // Do not call focusReviseCardVersion here — it used to rebuild this list
    // mid-click and swallow the expand/collapse.
    if (Number(item.key) > 0) {
      summary.addEventListener("click", () => {
        focusReviseCardVersion(Number(item.key), { rebuildAccordion: false });
      });
    }
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "revise-version-body";
    body.innerHTML = renderReviseVersionBody(item.card, {
      baselineArch: Boolean(item.baselineArch),
    });
    details.appendChild(body);
    el.reviseVersionList.appendChild(details);
    hydrateArchitectureMounts(body);
  }
}

function applyReviseFieldsFromCard(card) {
  const c = card || {};
  if (el.revGoal) el.revGoal.value = c.goal || "";
  if (el.revOut) el.revOut.value = c.outOfScope || "";
  if (el.revAccept) el.revAccept.value = c.acceptance || "";
  if (el.revAssume) el.revAssume.value = c.assumptions || "";
  syncReqSections();
}

function stashReviseDraftFromFields() {
  if (!state.reviseDraft || state.reviseLocked) return;
  const focus = Number(state.reviseCardFocus) || 0;
  const draftRev = Number(state.reviseDraft.revision) || 0;
  if (focus !== draftRev) return;
  // Read DOM directly — never call reviseCardValues() here (recursion).
  state.reviseDraft = {
    revision: draftRev,
    goal: (el.revGoal?.value || "").trim(),
    outOfScope: (el.revOut?.value || "").trim(),
    acceptance: (el.revAccept?.value || "").trim(),
    assumptions: (el.revAssume?.value || "").trim(),
  };
}

function reviseCardTitleText(revision) {
  const rev = Number(revision) || 0;
  if (rev > 0) return t("revise.titleRev", { revision: rev });
  return t("revise.title");
}

function syncReviseCardChrome({ rebuildAccordion = true } = {}) {
  const focus =
    Number(state.reviseCardFocus) ||
    Number(state.reviseDraft?.revision) ||
    Number(state.lastRevision?.revision) ||
    0;
  if (el.reviseTitle) el.reviseTitle.textContent = reviseCardTitleText(focus);
  renderReviseVersionChips();
  if (rebuildAccordion) renderReviseVersionAccordion();
  else renderReviseVersionAccordion({ force: false });
}

function isReviseDraftFocus() {
  const focus = Number(state.reviseCardFocus) || 0;
  const draftRev = Number(state.reviseDraft?.revision) || 0;
  return Boolean(draftRev && focus === draftRev && !state.reviseLocked);
}

function focusReviseCardVersion(revision, { rebuildAccordion = false } = {}) {
  const rev = Number(revision) || 0;
  if (rev < 1) return;
  stashReviseDraftFromFields();
  state.reviseCardFocus = rev;
  const draftRev = Number(state.reviseDraft?.revision) || 0;
  const editingDraft =
    Boolean(state.reviseDraft) &&
    draftRev === rev &&
    state.mode === "revise" &&
    !state.reviseLocked;
  if (editingDraft) {
    applyReviseFieldsFromCard(state.reviseDraft);
    setReviseFieldsReadonly(false);
  } else {
    const stored = getStoredReviseCard(rev);
    if (stored) {
      applyReviseFieldsFromCard(stored);
      setReviseFieldsReadonly(true);
    } else if (state.reviseDraft && draftRev === rev) {
      applyReviseFieldsFromCard(state.reviseDraft);
      setReviseFieldsReadonly(state.mode !== "revise" || state.reviseLocked);
    }
  }
  syncReviseCardChrome({ rebuildAccordion });
  // Avoid syncConfirmEnabled → syncReviseDispatchButton → full chrome churn on
  // every accordion header click.
  if (el.reviseTitle) el.reviseTitle.textContent = reviseCardTitleText(rev);
  void persistProjectChat();
}

function renderReviseVersionChips() {
  // Accordion (reviseVersionList) is the version browser; chips stay hidden.
  if (!el.reviseVersions) return;
  el.reviseVersions.replaceChildren();
  el.reviseVersions.hidden = true;
}

function setConfirmFieldsReadonly(ro) {
  for (const id of [
    "goal",
    "outOfScope",
    "acceptance",
    "assumptions",
    "deviceMatrix",
    "criticalPaths",
    "exceptionCases",
    "apiContract",
    "envChecklist",
    "dataPrecheck",
    "externalDeps",
    "perfBudget",
  ]) {
    if (el[id]) el[id].readOnly = Boolean(ro);
  }
  syncReqSections();
}

function setReviseFieldsReadonly(ro) {
  for (const id of ["revGoal", "revOut", "revAccept", "revAssume"]) {
    if (el[id]) el[id].readOnly = Boolean(ro);
  }
  syncReqSections();
}

function restoreConfirmCardFromOriginal() {
  if (!state.originalCard) return;
  const c = state.originalCard;
  el.goal.value = c.goal || "";
  el.outOfScope.value = c.outOfScope || "";
  el.acceptance.value = c.acceptance || "";
  el.assumptions.value = c.assumptions || "";
  if (el.deviceMatrix) el.deviceMatrix.value = c.deviceMatrix || "";
  if (el.criticalPaths) el.criticalPaths.value = c.criticalPaths || "";
  if (el.exceptionCases) el.exceptionCases.value = c.exceptionCases || "";
  if (el.apiContract) el.apiContract.value = c.apiContract || "";
  if (el.envChecklist) el.envChecklist.value = c.envChecklist || "";
  if (el.dataPrecheck) el.dataPrecheck.value = c.dataPrecheck || "";
  if (el.externalDeps) el.externalDeps.value = c.externalDeps || "";
  if (el.perfBudget) el.perfBudget.value = c.perfBudget || "";
  syncReqSections();
}

/** Top confirm card chrome never becomes 改进卡. */
function applyConfirmCardChrome() {
  const bug = state.deskKind === "bug";
  if (el.cardMark) el.cardMark.textContent = t(bug ? "card.bugMark" : "card.mark");
  if (el.cardTitle) el.cardTitle.textContent = t(bug ? "card.bugTitle" : "card.title");
  if (el.lblGoal) el.lblGoal.textContent = t(bug ? "card.bugGoal" : "card.goal");
  if (el.lblOut) el.lblOut.textContent = t(bug ? "card.bugOut" : "card.out");
  if (el.lblAccept) el.lblAccept.textContent = t(bug ? "card.bugAccept" : "card.accept");
  if (el.acceptHint) el.acceptHint.textContent = t(bug ? "card.bugAcceptHint" : "card.acceptHint");
  if (el.lblAssume) el.lblAssume.textContent = t(bug ? "card.bugAssume" : "card.assume");
  if (el.deviceMatrixField) el.deviceMatrixField.hidden = bug;
  if (el.criticalPathsField) el.criticalPathsField.hidden = bug;
  if (el.exceptionCasesField) el.exceptionCasesField.hidden = bug;
  if (el.apiContractField) el.apiContractField.hidden = bug;
  if (el.envChecklistField) el.envChecklistField.hidden = bug;
  if (el.dataPrecheckField) el.dataPrecheckField.hidden = bug;
  if (el.externalDepsField) el.externalDepsField.hidden = bug;
  if (el.perfBudgetField) el.perfBudgetField.hidden = bug;
  if (el.confirm && !modulesAllConfirmedLocal()) {
    el.confirm.textContent = t(bug ? "card.bugConfirm" : "card.confirm");
  }
  syncBugHotfixUi();
  syncStartBugFixButtons();
}

function syncBugHotfixUi() {
  const show = state.deskKind === "bug";
  if (el.bugHotfixRow) el.bugHotfixRow.hidden = !show;
  if (el.bugHotfix) {
    el.bugHotfix.checked = Boolean(state.bugHotfix);
    el.bugHotfix.disabled = state.dispatchPhase === "done" || state.busy;
  }
}

/** Show「修 bug」in the same bottom CTA slots as「再改一版」. */
function syncStartBugFixButtons() {
  if (state.deskKind === "bug") {
    for (const btn of [el.startBugFix, el.startBugFixEarly, el.startBugFixAlt]) {
      if (btn) btn.hidden = true;
    }
    if (el.deskBottomActions) el.deskBottomActions.hidden = true;
    return;
  }
  const dialoguing = state.mode === "revise" || state.reviseDialogueOpen;
  const accepted = Boolean(state.lastDeliveryAccepted);
  const previewVisible = el.previewPanel && !el.previewPanel.hidden;
  // Same gate as「再改一版」: result bar (or prior accept) keeps the path open
  // after deploy / while another wave is revising.
  const showWithRevise =
    Boolean(state.projectPath) &&
    !dialoguing &&
    (accepted || previewVisible || state.reviseStuckHint);
  const showEarly =
    Boolean(state.projectPath) && !state.locked && !accepted && !previewVisible;
  if (el.startBugFix) {
    el.startBugFix.hidden = !(showWithRevise && previewVisible);
    el.startBugFix.disabled = state.busy || state.reviseDispatching;
    el.startBugFix.textContent = t("card.kindBug");
  }
  if (el.startBugFixAlt) {
    el.startBugFixAlt.hidden = !(showWithRevise && !previewVisible);
    el.startBugFixAlt.disabled = state.busy || state.reviseDispatching;
    el.startBugFixAlt.textContent = t("card.kindBug");
  }
  if (el.startBugFixEarly) {
    el.startBugFixEarly.hidden = !showEarly;
    el.startBugFixEarly.disabled = state.busy;
    el.startBugFixEarly.textContent = t("card.kindBug");
  }
  if (el.deskBottomActions) {
    el.deskBottomActions.hidden = Boolean(el.startBugFixEarly?.hidden ?? true);
  }
}

function beginBugFixFromCta() {
  if (state.busy || state.reviseDispatching) return;
  if (!state.projectPath) {
    setHistoryOpen(true);
    return;
  }
  const fromDelivery = Boolean(state.locked || state.lastDeliveryAccepted);
  if (fromDelivery) {
    // Fresh defect card on this project (same spirit as「再改一版」).
    state.locked = false;
    state.lastDeliveryAccepted = false;
    state.jobId = null;
    state.dispatchPhase = null;
    state.taskPool = null;
    state.dispatchGraphReady = false;
    state.dispatchGraphBuilding = false;
    state.dispatchGraphUrl = null;
    state.dispatchGraphBuiltOnce = false;
    state.reviseLocked = false;
    state.revisePlanConfirmed = false;
    state.architecture = {
      status: "idle",
      ir: null,
      viewBox: null,
      fingerprint: "",
      url: null,
      summary: "",
      confirmed: false,
    };
    state.architectureMessages = [];
    state.mode = "specify";
    if (el.dispatch) el.dispatch.hidden = true;
    setConfirmFieldsReadonly(false);
    state.deskKind = "bug";
    state.modules = [
      {
        id: "bug",
        title: t("card.bugModuleTitle"),
        status: "draft",
        card: { goal: "", outOfScope: "", acceptance: "", assumptions: "" },
        dependsOn: [],
      },
    ];
    state.activeModuleId = "bug";
    applyActiveModuleToFields();
    applyConfirmCardChrome();
    renderModuleTabs();
    syncStartBugFixButtons();
    addBubble("bot", t("bot.bugKindPicked"));
    focusRightPanel({ force: true });
    schedulePersistProjectDesk();
    return;
  }
  enterDeskKind("bug");
  addBubble("bot", t("bot.bugKindPicked"));
  focusRightPanel({ force: true });
  schedulePersistProjectDesk();
}

function isBugIntentText(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  if (s === t("chat.optBug")) return true;
  return /修一个\s*bug|修\s*bug|fix a bug|修复缺陷|我想修 bug|バグを直|오류를|ошибк/i.test(s);
}

function isFeatureIntentText(text) {
  const s = String(text || "").trim();
  if (!s) return false;
  return (
    s === t("chat.optFeature") ||
    s === t("chat.optChange") ||
    s === t("chat.optScript")
  );
}

function enterDeskKind(kind) {
  const next = kind === "bug" ? "bug" : "feature";
  if (state.deskKind === next && next === "bug" && !state.locked) {
    syncStartBugFixButtons();
    return;
  }
  if (state.locked && next !== "bug") return;
  state.deskKind = next;
  if (next === "bug") {
    const card = activeModule()?.card || {
      goal: "",
      outOfScope: "",
      acceptance: "",
      assumptions: "",
    };
    state.modules = [
      {
        id: "bug",
        title: t("card.bugModuleTitle"),
        status: "draft",
        card: state.locked
          ? { goal: "", outOfScope: "", acceptance: "", assumptions: "" }
          : card,
        dependsOn: [],
      },
    ];
    state.activeModuleId = "bug";
    applyActiveModuleToFields();
  } else if (
    state.modules.length === 1 &&
    state.modules[0]?.id === "bug"
  ) {
    state.modules = [
      {
        id: "main",
        title: "Main",
        status: "draft",
        card: { ...state.modules[0].card },
        dependsOn: [],
      },
    ];
    state.activeModuleId = "main";
    applyActiveModuleToFields();
  }
  applyConfirmCardChrome();
  renderModuleTabs();
  schedulePersistProjectDesk();
}

function skipArchitectureForBug() {
  if (state.deskKind !== "bug") return;
  state.architecture = {
    status: "confirmed",
    ir: null,
    viewBox: null,
    fingerprint: "bug-skip",
    url: null,
    summary: t("arch.bugSkippedSummary"),
    confirmed: true,
  };
  state.mode = "specify";
  if (el.dispatch) el.dispatch.hidden = false;
  syncArchitecturePanel("bug-skip");
  syncDispatchProjectLine();
  syncTaskPoolPreview();
  syncOpenTaskGraphButton();
  void loadAgents();
  schedulePersistProjectDesk();
}

function cardFingerprint(v) {
  return JSON.stringify({
    goal: String(v.goal || "").trim(),
    outOfScope: String(v.outOfScope || "").trim(),
    acceptance: String(v.acceptance || "").trim(),
    assumptions: String(v.assumptions || "").trim(),
    deviceMatrix: String(v.deviceMatrix || "").trim(),
    criticalPaths: String(v.criticalPaths || "").trim(),
    exceptionCases: String(v.exceptionCases || "").trim(),
    apiContract: String(v.apiContract || "").trim(),
    envChecklist: String(v.envChecklist || "").trim(),
    dataPrecheck: String(v.dataPrecheck || "").trim(),
    externalDeps: String(v.externalDeps || "").trim(),
    perfBudget: String(v.perfBudget || "").trim(),
  });
}

function currentValidateKind() {
  return state.mode === "revise" && !state.reviseLocked ? "revise" : "confirm";
}

function currentValidateValues() {
  return currentValidateKind() === "revise" ? reviseCardValues() : cardValues();
}

function resetValidateGate({ keepHint = false } = {}) {
  state.validate = {
    kind: currentValidateKind(),
    fingerprint: "",
    status: "idle",
    summary: "",
    issues: [],
  };
  if (!keepHint) {
    if (el.validateHint) {
      el.validateHint.hidden = true;
      el.validateHint.textContent = "";
    }
    if (el.reviseValidateHint) {
      el.reviseValidateHint.hidden = true;
      el.reviseValidateHint.textContent = "";
    }
  }
  syncAutoHandleButtons();
}

function renderValidateHint() {
  const kind = state.validate.kind || "confirm";
  const target =
    kind === "revise" ? el.reviseValidateHint : el.validateHint;
  const other =
    kind === "revise" ? el.validateHint : el.reviseValidateHint;
  if (other) {
    other.hidden = true;
    other.textContent = "";
  }
  if (!target) return;
  const st = state.validate.status;
  if (st === "idle") {
    target.hidden = true;
    target.textContent = "";
    syncAutoHandleButtons();
    return;
  }
  target.hidden = false;
  if (st === "checking") {
    target.textContent = t("validate.checking");
    syncAutoHandleButtons();
    return;
  }
  if (st === "passed") {
    target.textContent = t("validate.passed", {
      summary: state.validate.summary || "",
    });
    syncAutoHandleButtons();
    return;
  }
  const issues = state.validate.issues || [];
  const detail = issues.length ? `\n- ${issues.join("\n- ")}` : "";
  target.textContent = t("validate.failed", {
    summary: state.validate.summary || t("bot.acceptFailedDefault"),
    detail,
  });
  syncAutoHandleButtons();
}

function syncAutoHandleButtons() {
  const failed = state.validate.status === "failed";
  const confirmFail =
    failed &&
    state.validate.kind === "confirm" &&
    !state.locked &&
    state.mode !== "revise" &&
    !state.reviseLocked;
  const reviseFail =
    failed &&
    state.validate.kind === "revise" &&
    state.mode === "revise" &&
    !state.reviseLocked;
  if (el.autoFixCard) {
    el.autoFixCard.hidden = !confirmFail;
    el.autoFixCard.disabled = state.busy || !state.ready;
    if (!state.busy) el.autoFixCard.textContent = t("card.autoHandle");
  }
  if (el.autoFixRevise) {
    el.autoFixRevise.hidden = !reviseFail;
    el.autoFixRevise.disabled = state.busy || !state.ready;
    if (!state.busy) el.autoFixRevise.textContent = t("card.autoHandle");
  }
}

function confirmFieldsOk(v = cardValues()) {
  if (!v.goal || !v.acceptance) return false;
  if (state.deskKind === "bug") return true;
  return Boolean(v.deviceMatrix && v.criticalPaths && v.exceptionCases && v.apiContract && v.envChecklist && v.dataPrecheck && v.externalDeps && v.perfBudget);
}

function validationAllowsSend(kind) {
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  if (kind === "confirm" ? !confirmFieldsOk(v) : !v.goal || !v.acceptance) {
    return false;
  }
  return (
    state.validate.kind === kind &&
    state.validate.status === "passed" &&
    state.validate.fingerprint === cardFingerprint(v)
  );
}

function scheduleValidate(kind = currentValidateKind()) {
  if (modulesAllConfirmedLocal() && kind === "confirm") return;
  if (state.reviseLocked && kind === "revise") return;
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  const readyFields =
    kind === "confirm" ? confirmFieldsOk(v) : Boolean(v.goal && v.acceptance);
  if (!readyFields || !state.ready) {
    resetValidateGate();
    syncConfirmEnabled();
    return;
  }
  const fp = cardFingerprint(v);
  if (
    state.validate.kind === kind &&
    state.validate.fingerprint === fp &&
    (state.validate.status === "passed" || state.validate.status === "checking")
  ) {
    syncConfirmEnabled();
    return;
  }
  state.validate = {
    kind,
    fingerprint: fp,
    status: "checking",
    summary: "",
    issues: [],
  };
  renderValidateHint();
  syncConfirmEnabled();
  clearTimeout(state.validateTimer);
  state.validateTimer = window.setTimeout(() => {
    void runValidate(kind, fp);
  }, 550);
}

async function runValidate(kind, expectedFp) {
  const seq = ++state.validateSeq;
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  const fp = cardFingerprint(v);
  if (expectedFp && fp !== expectedFp) return;
  const readyFields =
    kind === "confirm" ? confirmFieldsOk(v) : Boolean(v.goal && v.acceptance);
  if (!readyFields || !state.ready) {
    if (seq === state.validateSeq) resetValidateGate();
    syncConfirmEnabled();
    return;
  }
  state.validate = {
    kind,
    fingerprint: fp,
    status: "checking",
    summary: "",
    issues: [],
  };
  renderValidateHint();
  syncConfirmEnabled();
  try {
    const res = await fetch("/api/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...v,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        projectPath: state.projectPath || undefined,
        previewUrl: state.lastPreviewUrl || undefined,
      }),
    });
    const data = await res.json();
    if (seq !== state.validateSeq) return;
    const live = kind === "revise" ? reviseCardValues() : cardValues();
    if (cardFingerprint(live) !== fp) return;
    if (data.card) {
      if (kind === "revise") {
        if (el.revGoal) el.revGoal.value = data.card.goal || "";
        if (el.revOut) el.revOut.value = data.card.outOfScope || "";
        if (el.revAccept) el.revAccept.value = data.card.acceptance || "";
        if (el.revAssume) el.revAssume.value = data.card.assumptions || "";
        syncReqSections();
      } else {
        applyCard(data.card, { skipValidate: true });
      }
    }
    const next = kind === "revise" ? reviseCardValues() : cardValues();
    const nextFp = cardFingerprint(next);
    const passed = Boolean(data.passed) && res.ok;
    state.validate = {
      kind,
      fingerprint: nextFp,
      status: passed ? "passed" : "failed",
      summary: data.summary || data.error || "",
      issues: Array.isArray(data.issues) ? data.issues : [],
    };
    renderValidateHint();
    syncConfirmEnabled();
    schedulePersistProjectDesk();
  } catch (err) {
    if (seq !== state.validateSeq) return;
    state.validate = {
      kind,
      fingerprint: fp,
      status: "failed",
      summary: err instanceof Error ? err.message : t("err.validate"),
      issues: [],
    };
    renderValidateHint();
    syncConfirmEnabled();
    schedulePersistProjectDesk();
  }
}

/** Confirm enablement without rebuilding module tabs (tabs flicker if rebuilt every tick). */
function refreshConfirmButtonOnly() {
  if (!el.confirm) return;
  if (state.mode === "revise" || state.reviseLocked) {
    el.confirm.disabled = true;
    el.confirm.textContent = t("card.confirmed");
    return;
  }
  const v = cardValues();
  const fieldsOk = confirmFieldsOk(v);
  const validated = validationAllowsSend("confirm");
  const active = activeModule();
  const moduleLocked = active?.status === "confirmed";
  const allDone = modulesAllConfirmedLocal();
  const ok =
    fieldsOk &&
    !moduleLocked &&
    !allDone &&
    state.ready &&
    validated &&
    !state.busy;
  if (!moduleLocked && !allDone) {
    el.confirm.textContent =
      state.validate.status === "checking"
        ? t("card.validating")
        : t("card.confirm");
    el.confirm.disabled = !ok;
  } else if (allDone) {
    el.confirm.textContent = t("card.allModulesConfirmed");
    el.confirm.disabled = true;
  } else {
    el.confirm.textContent = t("card.confirmed");
    el.confirm.disabled = true;
  }
}

function syncConfirmEnabled() {
  applyConfirmCardChrome();
  syncComposerEnabled();
  // Top confirm card: only for initial specify flow
  if (state.mode === "revise" || state.reviseLocked) {
    restoreConfirmCardFromOriginal();
    setConfirmFieldsReadonly(true);
    el.confirm.disabled = true;
    el.confirm.textContent = t("card.confirmed");
    el.lockHint.textContent = t("card.lockHintRevise");
    const v = reviseCardValues();
    const fieldsOk = Boolean(v.goal && v.acceptance);
    const ok =
      state.mode === "revise" &&
      fieldsOk &&
      state.ready &&
      !state.busy &&
      !state.reviseDispatching &&
      validationAllowsSend("revise");
    if (el.reviseHint && state.mode === "revise" && !state.reviseLocked) {
      if (state.validate.status === "checking") {
        el.lockHint.textContent = t("card.lockHintRevise");
      }
    }
    syncReviseDispatchButton(ok);
    syncAutoHandleButtons();
    return;
  }
  const v = cardValues();
  const fieldsOk = confirmFieldsOk(v);
  const validated = validationAllowsSend("confirm");
  const active = activeModule();
  const moduleLocked = active?.status === "confirmed";
  const allDone = modulesAllConfirmedLocal();
  if (allDone) {
    el.lockHint.textContent = t("card.lockHintLocked");
  } else if (moduleLocked) {
    el.lockHint.textContent = t("card.lockHintModuleDone");
  } else if (!fieldsOk) {
    el.lockHint.textContent = t("card.lockHintNeed");
  } else if (state.validate.status === "checking") {
    el.lockHint.textContent = t("card.lockHintChecking");
  } else if (state.validate.status === "failed") {
    el.lockHint.textContent = t("card.lockHintFailed");
  } else if (validated) {
    el.lockHint.textContent = t("card.lockHintReady");
  } else {
    el.lockHint.textContent = t("card.lockHintNeedValidate");
  }
  refreshConfirmButtonOnly();
  setConfirmFieldsReadonly(moduleLocked || allDone);
  // Do not renderModuleTabs here — every validate/input tick rebuilt tabs.
  syncTaskPoolPreview();
  syncReviseDispatchButton(false);
  syncAutoHandleButtons();
}

function focusNextUnconfirmedModule() {
  ensureModulesSeed();
  const next = state.modules.find((m) => m.status !== "confirmed");
  if (!next) return false;
  state.activeModuleId = next.id;
  applyActiveModuleToFields();
  resetValidateGate();
  setConfirmFieldsReadonly(false);
  renderModuleTabs();
  return true;
}

function syncReviseDispatchButton(ready) {
  if (!el.doReviseDispatch) return;
  const dialoguing = state.mode === "revise";
  const showCard =
    dialoguing ||
    state.reviseLocked ||
    Boolean(state.lastRevision) ||
    (Array.isArray(state.reviseCards) && state.reviseCards.length > 0) ||
    Boolean(state.reviseDraft);
  if (el.reviseCardFields) {
    el.reviseCardFields.hidden = !showCard && !dialoguing;
  }
  const showDispatch = dialoguing && !state.reviseLocked;
  el.doReviseDispatch.hidden = !showDispatch;
  // Architecture is gated *after* plan confirm — do not block this button on arch.
  el.doReviseDispatch.disabled =
    !ready ||
    state.busy ||
    state.reviseDispatching ||
    state.revisePlanConfirmed;
  if (showDispatch) {
    el.doReviseDispatch.textContent = state.revisePlanConfirmed
      ? t("arch.needConfirmAfterPlan")
      : state.reviseDispatching
        ? t("revise.dispatching")
        : t("revise.dispatch");
  }
  // After「请先确认架构」cue: diagram sits immediately below this button.
  if (state.revisePlanConfirmed && !state.architecture?.confirmed) {
    placeArchitecturePanelForFlow();
  } else if (el.architecturePanel?.parentElement === el.architectureSlotRevise) {
    placeArchitecturePanelForFlow();
  }
  if (state.reviseLocked && !dialoguing) {
    setReviseFieldsReadonly(true);
  } else if (dialoguing && !state.reviseKickoffInFlight) {
    setReviseFieldsReadonly(
      state.revisePlanConfirmed || !isReviseDraftFocus(),
    );
  }
  // Never rebuild accordion / iframes while revise kickoff is streaming.
  if (!state.reviseKickoffInFlight) {
    syncReviseCardChrome({ rebuildAccordion: false });
  }
  const status = state.lastStatus;
  const accepted = state.lastDeliveryAccepted || status === "accepted";
  const revising = status === "revising";
  const previewVisible = el.previewPanel && !el.previewPanel.hidden;
  if (el.reviseHint) {
    if (revising && state.reviseStuckHint && !dialoguing) {
      el.reviseHint.textContent = t("revise.hintStuck");
    } else if (revising && !dialoguing) {
      el.reviseHint.textContent = t("revise.hintRevising");
    } else if (state.reviseLocked && !dialoguing) {
      el.reviseHint.textContent = t("revise.hintLocked");
    } else if (!dialoguing) {
      el.reviseHint.textContent = t("revise.hintIdle");
    } else if (state.reviseDispatching) {
      el.reviseHint.textContent = t("revise.hintEnqueue");
    } else if (state.busy) {
      el.reviseHint.textContent = t("revise.hintBusy");
    } else if (ready) {
      el.reviseHint.textContent = t("revise.hintReady");
    } else {
      el.reviseHint.textContent = t("revise.hintNeed");
    }
  }
  if (el.startReviseChat || el.startReviseChatAlt) {
    // Result bar stays the home for next iterate / bug — deploy or an in-flight
    // revise wave must not hide the CTAs (only an active dialogue does).
    const showCta =
      Boolean(state.projectPath) &&
      !dialoguing &&
      (accepted || previewVisible || state.reviseStuckHint);
    if (el.startReviseChat) {
      el.startReviseChat.hidden = !(showCta && previewVisible);
      // Keep clickable while chat is busy — disabled buttons swallow clicks.
      el.startReviseChat.disabled = state.reviseDispatching;
      el.startReviseChat.textContent = t("revise.again");
    }
    if (el.startReviseChatAlt) {
      el.startReviseChatAlt.hidden = !(showCta && !previewVisible);
      el.startReviseChatAlt.disabled = state.reviseDispatching;
      el.startReviseChatAlt.textContent = t("revise.again");
    }
  }
  syncStartBugFixButtons();
  if (el.chatPanel) {
    el.chatPanel.classList.toggle("revise-active", dialoguing);
  }
}

function applyCardChrome() {
  // Confirm card styling/labels stay fixed; revise uses the bottom card only.
  applyConfirmCardChrome();
  syncConfirmEnabled();
}

["goal", "outOfScope", "acceptance", "assumptions", "deviceMatrix", "criticalPaths", "exceptionCases", "apiContract", "envChecklist", "dataPrecheck", "externalDeps", "perfBudget"].forEach((id) => {
  if (!el[id]) return;
  el[id].addEventListener("input", () => {
    autoGrowTextarea(el[id]);
    schedulePersistProjectDesk();
    if (state.locked) return;
    scheduleValidate("confirm");
  });
});
["revGoal", "revOut", "revAccept", "revAssume"].forEach((id) => {
  if (el[id]) {
    el[id].addEventListener("input", () => {
      autoGrowTextarea(el[id]);
      if (isReviseDraftFocus()) stashReviseDraftFromFields();
      schedulePersistProjectDesk();
      if (state.reviseLocked || !isReviseDraftFocus()) return;
      scheduleValidate("revise");
    });
  }
});

function syncChatEmpty() {
  if (!el.chatEmpty || !el.log) return;
  el.chatEmpty.hidden = Boolean(el.log.querySelector(".bubble"));
}

function appendOptionChips(host, options) {
  const opts = enrichChatOptions("", options);
  if (!host || !opts.length) return;
  host.querySelectorAll(":scope > .options.choice-options").forEach((n) => n.remove());
  const row = document.createElement("div");
  row.className = "options choice-options";
  for (const opt of opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip choice-chip";
    b.textContent = opt;
    b.addEventListener("click", () => {
      if (!chatAllowed()) {
        explainChatBlocked();
        syncComposerEnabled();
        return;
      }
      if (isBugIntentText(opt)) enterDeskKind("bug");
      else if (isFeatureIntentText(opt)) enterDeskKind("feature");
      el.input.value = opt;
      el.form.requestSubmit();
    });
    row.appendChild(b);
  }
  host.appendChild(row);
  scrollChatToLatest();
}

/** Keep focus in chat while designing architecture or revising; otherwise follow card stage. */
function afterChatBubbleUi({ forceRight = false } = {}) {
  scrollChatToLatest();
  if (forceRight) {
    focusRightPanel({ force: true });
    return;
  }
  if (state.mode === "architecture" || state.reviseDialogueOpen) {
    el.input?.focus();
    return;
  }
  focusRightPanel({ force: false });
}

function architectureContinueOptions(parsed) {
  // Only treat as “diagram ready” when we have a render URL or real components.
  // ready + diagram_type alone is a common false claim from the model.
  const hasRenderable =
    Boolean(String(parsed?.architectureUrl || "").trim()) ||
    (Array.isArray(parsed?.components) && parsed.components.length > 0);
  if (hasRenderable) return [];
  if (Array.isArray(parsed?.options) && parsed.options.length) {
    return parsed.options;
  }
  return [t("arch.optDrawNow"), t("arch.optStorage"), t("arch.optChangePath")];
}

function addBubble(role, text, { options, actions } = {}) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  const body = document.createElement("div");
  body.className = "bubble-body";
  body.innerHTML = renderChatMarkdown(text);
  div.appendChild(body);
  if (options?.length) appendOptionChips(div, options);
  if (actions?.length) {
    const row = document.createElement("div");
    row.className = "options";
    for (const act of actions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip action-chip";
      b.textContent = act.label;
      b.addEventListener("click", () => {
        if (typeof act.onClick === "function") void act.onClick(b);
      });
      row.appendChild(b);
    }
    div.appendChild(row);
  }
  el.log.appendChild(div);
  syncChatEmpty();
  afterChatBubbleUi();
  return { div, body };
}

function startStreamingBubble() {
  const { div, body } = addBubble("bot", "");
  div.classList.add("streaming");
  let plain = "";
  return {
    div,
    body,
    append(chunk) {
      plain += chunk;
      // Plain text while streaming (stable cursor); render Markdown on finish.
      body.textContent = plain;
      scrollChatToLatest();
    },
    set(text) {
      plain = String(text || "");
      body.textContent = plain;
      scrollChatToLatest();
    },
    getText() {
      return plain;
    },
    finish(options) {
      try {
        div.classList.remove("streaming");
      } catch {
        /* ignore */
      }
      const reply = plain;
      try {
        body.innerHTML = renderChatMarkdown(reply);
      } catch {
        body.textContent = reply;
      }
      try {
        const opts = enrichChatOptions(reply, options);
        appendOptionChips(div, opts);
      } catch {
        /* ignore chip failures */
      }
      try {
        afterChatBubbleUi();
      } catch {
        /* ignore */
      }
    },
  };
}

async function readChatStream(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    for (const block of chunks) {
      const line = block
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        onEvent(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }
}

function clearChatLog() {
  if (!el.log) return;
  for (const node of [...el.log.children]) {
    if (node.id === "chatEmpty") continue;
    node.remove();
  }
  syncChatEmpty();
}

function renderMessagesToLog(messages) {
  clearChatLog();
  for (const m of messages || []) {
    const role = m.role === "user" ? "user" : "bot";
    addBubble(role, m.content || "");
  }
}

async function persistProjectChat() {
  if (!state.projectPath) return;
  try {
    // Omit deep architecture.ir — stringify can throw Maximum call stack size exceeded.
    const archLite = {
      status: state.architecture.status,
      ir: null,
      viewBox: state.architecture.viewBox || null,
      fingerprint: String(state.architecture.fingerprint || ""),
      url: state.architecture.url,
      summary: state.architecture.summary,
      confirmed: state.architecture.confirmed,
    };
    const prevLite = state.architecturePrevious
      ? {
          ir: null,
          viewBox: state.architecturePrevious.viewBox || null,
          fingerprint: String(state.architecturePrevious.fingerprint || ""),
          url: state.architecturePrevious.url,
          summary: state.architecturePrevious.summary || "",
        }
      : null;
    const initLite = state.initialArchitecture?.url
      ? {
          url: state.initialArchitecture.url,
          ir: null,
          viewBox: state.initialArchitecture.viewBox || null,
          summary: state.initialArchitecture.summary || "",
          changed: Boolean(state.initialArchitecture.changed),
          fingerprint: String(state.initialArchitecture.fingerprint || ""),
        }
      : null;
    const cardsLite = (state.reviseCards || []).map((e) => ({
      revision: e.revision,
      goal: e.goal,
      outOfScope: e.outOfScope,
      acceptance: e.acceptance,
      assumptions: e.assumptions,
      at: e.at || undefined,
      architecture: e.architecture?.url
        ? {
            url: e.architecture.url,
            ir: null,
            viewBox: e.architecture.viewBox || null,
            summary: e.architecture.summary || "",
            changed: Boolean(e.architecture.changed),
            fingerprint: String(e.architecture.fingerprint || ""),
          }
        : undefined,
    }));
    const bugCardsLite = (state.bugCards || []).map((e) => ({
      id: e.id,
      seq: e.seq,
      goal: e.goal,
      outOfScope: e.outOfScope,
      acceptance: e.acceptance,
      assumptions: e.assumptions,
      at: e.at || undefined,
    }));
    await fetch("/api/projects/chat", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectPath: state.projectPath,
        messages: state.messages,
        reviseMessages: state.reviseMessages,
        rawAsk: state.rawAsk || "",
        card: cardValues(),
        modules: state.modules,
        activeModuleId: state.activeModuleId,
        taskPool: state.taskPool,
        workerCount: state.workerCount || 1,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        bugHotfix: Boolean(state.bugHotfix),
        dispatchGraphReady: Boolean(state.dispatchGraphReady),
        dispatchGraphUrl: state.dispatchGraphUrl || null,
        dispatchGraphBuiltOnce: Boolean(state.dispatchGraphBuiltOnce),
        reviseCard: reviseCardValues(),
        reviseCards: cardsLite,
        bugCards: bugCardsLite,
        reviseDraft: (() => {
          stashReviseDraftFromFields();
          return state.reviseDraft;
        })(),
        reviseCardFocus: state.reviseCardFocus,
        initialArchitecture: initLite,
        reviseExpanded: state.reviseExpanded,
        originalCard: state.originalCard,
        jobId: state.jobId,
        locked: state.locked,
        mode: state.mode,
        reviseLocked: state.reviseLocked,
        revisePlanConfirmed: state.revisePlanConfirmed,
        lastRevision: state.lastRevision,
        deployTarget: state.deployTarget || "none",
        agentId: state.agentId || "",
        architecture: archLite,
        architecturePrevious: prevLite,
        architectureMessages: state.architectureMessages,
        dispatchPhase: state.dispatchPhase === "done" ? "done" : null,
        baseline: state.baseline,
        validate: {
          kind: state.validate.kind,
          fingerprint: state.validate.fingerprint,
          status: state.validate.status,
          summary: state.validate.summary,
          issues: state.validate.issues,
        },
      }),
    });
  } catch {
    /* ignore persist errors */
  }
}

let persistDeskTimer = 0;
function schedulePersistProjectDesk() {
  if (!state.projectPath) return;
  clearTimeout(persistDeskTimer);
  persistDeskTimer = setTimeout(() => {
    void persistProjectChat();
  }, 400);
}

function applySavedCardFields(card, reviseCard) {
  const c = card || {};
  if (el.goal) el.goal.value = c.goal || "";
  if (el.outOfScope) el.outOfScope.value = c.outOfScope || "";
  if (el.acceptance) el.acceptance.value = c.acceptance || "";
  if (el.assumptions) el.assumptions.value = c.assumptions || "";
  if (el.deviceMatrix) el.deviceMatrix.value = c.deviceMatrix || "";
  if (el.criticalPaths) el.criticalPaths.value = c.criticalPaths || "";
  if (el.exceptionCases) el.exceptionCases.value = c.exceptionCases || "";
  if (el.apiContract) el.apiContract.value = c.apiContract || "";
  if (el.envChecklist) el.envChecklist.value = c.envChecklist || "";
  if (el.dataPrecheck) el.dataPrecheck.value = c.dataPrecheck || "";
  if (el.externalDeps) el.externalDeps.value = c.externalDeps || "";
  if (el.perfBudget) el.perfBudget.value = c.perfBudget || "";
  const r = reviseCard || {};
  if (el.revGoal) el.revGoal.value = r.goal || "";
  if (el.revOut) el.revOut.value = r.outOfScope || "";
  if (el.revAccept) el.revAccept.value = r.acceptance || "";
  if (el.revAssume) el.revAssume.value = r.assumptions || "";
  syncReqSections();
}

/** Restore validate gate when fingerprint still matches the card. */
function restoreValidateGate(saved) {
  const v = saved && typeof saved === "object" ? saved : null;
  const kind =
    v?.kind === "revise"
      ? "revise"
      : currentValidateKind();
  const values = kind === "revise" ? reviseCardValues() : cardValues();
  const fp = cardFingerprint(values);
  const fieldsOk =
    kind === "confirm" ? confirmFieldsOk(values) : Boolean(values.goal && values.acceptance);
  if (
    v &&
    (v.status === "passed" || v.status === "failed") &&
    v.fingerprint &&
    v.fingerprint === fp &&
    (v.kind === kind || (!v.kind && kind === "confirm"))
  ) {
    state.validate = {
      kind,
      fingerprint: fp,
      status: v.status,
      summary: String(v.summary || ""),
      issues: Array.isArray(v.issues) ? v.issues : [],
    };
    renderValidateHint();
    return;
  }
  resetValidateGate();
  if (!state.locked && fieldsOk && kind === "confirm") {
    scheduleValidate("confirm");
  } else if (
    state.mode === "revise" &&
    !state.reviseLocked &&
    fieldsOk
  ) {
    scheduleValidate("revise");
  }
}

/**
 * Wipe chat / 需求 / 运行 / 结果 surfaces before loading another project's desk.
 * Saved session data is applied on top by loadProjectChatIntoUi.
 */
function stopStatusPoll() {
  if (state.statusTimer) {
    clearInterval(state.statusTimer);
    state.statusTimer = null;
  }
}

function clearDeskWorkspace() {
  stopStatusPoll();
  if (typeof stopPreviewStatusPoll === "function") stopPreviewStatusPoll();
  clearRunTimeline();
  clearChatLog();

  state.messages = [];
  state.reviseMessages = [];
  state.architectureMessages = [];
  state.rawAsk = "";
  state.jobId = null;
  state.locked = false;
  state.deskKind = "feature";
  state.bugHotfix = false;
  state.modules = [];
  state.activeModuleId = null;
  state.workerCount = 1;
  state.taskPool = null;
  state.dispatchGraphReady = false;
  state.dispatchGraphBuilding = false;
  state.dispatchGraphUrl = null;
  state.dispatchGraphBuiltOnce = false;
  state.recommendedWorkerCount = 1;
  state.mode = "specify";
  if (el.moduleTabs) {
    el.moduleTabs.replaceChildren();
    el.moduleTabs.hidden = true;
  }
  if (el.moduleMeta) {
    el.moduleMeta.hidden = true;
    el.moduleMeta.textContent = "";
  }
  if (el.taskPoolPreview) el.taskPoolPreview.hidden = false;
  if (el.taskPoolList) el.taskPoolList.replaceChildren();
  if (el.taskPoolEmpty) el.taskPoolEmpty.hidden = false;
  if (el.workerRecommendHint) el.workerRecommendHint.hidden = true;
  syncOpenTaskGraphButton();
  renderWorkerCountList();
  state.reviseLocked = false;
  state.reviseDispatching = false;
  state.reviseStuckHint = false;
  state.reviseDialogueOpen = false;
  state.reviseKickoffInFlight = false;
  state.originalCard = null;
  state.lastRevision = null;
  state.reviseCards = [];
  state.bugCards = [];
  state.reviseDraft = null;
  state.reviseCardFocus = null;
  state.revisePlanConfirmed = false;
  state.initialArchitecture = null;
  state.reviseExpanded = {};
  state.reviseAccordionFp = "";
  state.dispatchPhase = null;
  state.baseline = emptyBaseline();
  state.lastDeliveryAccepted = false;
  state.lastPreviewUrl = null;
  state.previewFollowLatest = true;
  state.previewFocusRevision = null;
  state.lastDispatch = null;
  state.lastStatus = null;
  state.lastChatBlockMsg = "";
  state.progressFocusKey = "";
  state.architecture = {
    status: "idle",
    ir: null,
    url: null,
    summary: "",
    confirmed: false,
  };
  state.architecturePrevious = null;

  applySavedCardFields(null, null);
  setConfirmFieldsReadonly(false);
  setReviseFieldsReadonly(false);
  resetValidateGate();
  applyConfirmCardChrome();
  applyCardChrome();

  if (el.confirm) {
    el.confirm.disabled = true;
    el.confirm.textContent = t("card.confirm");
  }
  if (el.lockHint) el.lockHint.textContent = "";
  if (el.result) {
    el.result.hidden = true;
    el.result.textContent = "";
  }
  if (el.dispatch) el.dispatch.hidden = true;
  if (el.dispatchStatus) {
    el.dispatchStatus.hidden = true;
    el.dispatchStatus.textContent = "";
  }
  if (el.dispatchErr) {
    el.dispatchErr.hidden = true;
    el.dispatchErr.textContent = "";
  }
  if (el.doDispatch) {
    el.doDispatch.disabled = false;
    el.doDispatch.textContent = t("dispatch.do");
  }
  if (el.previewPanel) el.previewPanel.hidden = true;
  if (el.previewService) el.previewService.hidden = true;
  if (el.previewVersions) {
    el.previewVersions.replaceChildren();
    el.previewVersions.hidden = true;
  }
  if (el.reviseVersions) {
    el.reviseVersions.replaceChildren();
    el.reviseVersions.hidden = true;
  }
  if (el.reviseVersionList) {
    el.reviseVersionList.replaceChildren();
    el.reviseVersionList.hidden = true;
  }
  if (el.reviseTitle) el.reviseTitle.textContent = t("revise.title");
  if (el.previewLink) el.previewLink.hidden = true;
  if (el.previewDeploy) {
    el.previewDeploy.hidden = true;
    el.previewDeploy.disabled = false;
  }
  if (el.previewOpenFolder) el.previewOpenFolder.hidden = true;
  if (el.startReviseChat) el.startReviseChat.hidden = true;
  if (el.revisePanel) el.revisePanel.hidden = true;
  if (el.startReviseChatAlt) el.startReviseChatAlt.hidden = true;
  if (el.doReviseDispatch) el.doReviseDispatch.hidden = true;
  if (el.architecturePanel) el.architecturePanel.hidden = true;
  clearArchitectureMount(el.architectureFrame);
  clearArchitectureMount(el.architecturePreviousFrame);
  if (el.architecturePreviousBlock) el.architecturePreviousBlock.hidden = true;
  if (el.progressEmpty) el.progressEmpty.hidden = false;

  syncDispatchProjectLine();
  syncDeliverablesEntry();
  syncConfirmEnabled();
  syncComposerEnabled();
  syncChatEmpty();
}

/**
 * Load saved desk session (chat + 需求卡 + job/任务绑定) for a project.
 * Always clears the previous project's surfaces first.
 * @returns {Promise<number>} message count restored
 */
async function loadProjectChatIntoUi(projectPath) {
  const abs = String(projectPath || "").trim();
  clearDeskWorkspace();
  if (!abs) return 0;
  try {
    const res = await fetch(
      `/api/projects/chat?path=${encodeURIComponent(abs)}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "chat load failed");
    state.messages = Array.isArray(data.messages) ? data.messages : [];
    state.reviseMessages = Array.isArray(data.reviseMessages)
      ? data.reviseMessages
      : [];
    state.rawAsk = data.rawAsk || "";
    state.jobId = data.jobId || null;
    state.locked = Boolean(data.locked);
    state.mode =
      data.mode === "revise" || data.mode === "architecture"
        ? data.mode
        : "specify";
    state.reviseDialogueOpen =
      state.mode === "revise" && !Boolean(data.reviseLocked);
    state.reviseLocked = Boolean(data.reviseLocked);
    state.originalCard = data.originalCard || null;
    state.lastRevision = data.lastRevision || null;
    state.reviseCards = Array.isArray(data.reviseCards) ? data.reviseCards : [];
    state.bugCards = Array.isArray(data.bugCards) ? data.bugCards : [];
    state.reviseDraft =
      data.reviseDraft && typeof data.reviseDraft === "object"
        ? data.reviseDraft
        : null;
    state.reviseCardFocus =
      data.reviseCardFocus != null ? Number(data.reviseCardFocus) || null : null;
    state.revisePlanConfirmed = Boolean(data.revisePlanConfirmed);
    state.initialArchitecture =
      data.initialArchitecture && data.initialArchitecture.url
        ? {
            url: data.initialArchitecture.url,
            ir: null,
            viewBox: normalizeViewBox(data.initialArchitecture.viewBox),
            summary: data.initialArchitecture.summary || "",
            changed: Boolean(data.initialArchitecture.changed),
            fingerprint: String(data.initialArchitecture.fingerprint || ""),
          }
        : null;
    state.reviseExpanded =
      data.reviseExpanded && typeof data.reviseExpanded === "object"
        ? data.reviseExpanded
        : {};
    // Migrate: single reviseCard + lastRevision → version list when empty
    if (
      !state.reviseCards.length &&
      state.lastRevision &&
      Number(state.lastRevision.revision) > 0
    ) {
      upsertReviseCardEntry(state.lastRevision.revision, {
        goal: state.lastRevision.change || data.reviseCard?.goal || "",
        outOfScope: state.lastRevision.keep || data.reviseCard?.outOfScope || "",
        acceptance:
          state.lastRevision.acceptance || data.reviseCard?.acceptance || "",
        assumptions:
          state.lastRevision.reason || data.reviseCard?.assumptions || "",
      });
    }
    if (data.deployTarget) state.deployTarget = data.deployTarget;
    if (data.agentId) state.agentId = data.agentId;
    if (data.architecture && typeof data.architecture === "object") {
      state.architecture = {
        status: data.architecture.status || "idle",
        ir: null,
        viewBox: normalizeViewBox(data.architecture.viewBox),
        fingerprint: String(data.architecture.fingerprint || ""),
        url: data.architecture.url || null,
        summary: data.architecture.summary || "",
        confirmed: Boolean(data.architecture.confirmed),
      };
    }
    state.architecturePrevious =
      data.architecturePrevious && data.architecturePrevious.url
        ? {
            ir: null,
            viewBox: normalizeViewBox(data.architecturePrevious.viewBox),
            fingerprint: String(data.architecturePrevious.fingerprint || ""),
            url: data.architecturePrevious.url,
            summary: data.architecturePrevious.summary || "",
          }
        : null;
    state.architectureMessages = Array.isArray(data.architectureMessages)
      ? data.architectureMessages
      : [];
    state.dispatchPhase = data.dispatchPhase === "done" ? "done" : null;
    state.baseline = clipBaseline(data.baseline);
    if (state.baseline.signer && el.baselineSigner) {
      el.baselineSigner.value = state.baseline.signer;
    }
    if (Array.isArray(data.modules) && data.modules.length) {
      state.modules = data.modules.map((m) => ({
        id: String(m.id),
        title: String(m.title || m.id),
        status: String(m.status || "draft"),
        card: restoreConfirmCard(m),
        dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn.map(String) : [],
      }));
      state.activeModuleId =
        data.activeModuleId || state.modules[0]?.id || null;
      // Prefer module statuses over stale single-card locked flag
      state.locked = modulesAllConfirmedLocal();
    } else if (data.card) {
      state.modules = [
        {
          id: "main",
          title: "Main",
          status: data.locked ? "confirmed" : "draft",
          card: restoreConfirmCard(data.card),
          dependsOn: [],
        },
      ];
      state.activeModuleId = "main";
      state.locked = Boolean(data.locked);
    } else {
      state.modules = [];
      state.activeModuleId = null;
    }
    state.taskPool = data.taskPool || null;
    state.workerCount = Number(data.workerCount) > 0 ? Number(data.workerCount) : 1;
    state.deskKind = data.deskKind === "bug" ? "bug" : "feature";
    state.bugHotfix = Boolean(data.bugHotfix);
    state.dispatchGraphReady = Boolean(data.dispatchGraphReady);
    state.dispatchGraphUrl = String(data.dispatchGraphUrl || "").trim() || null;
    state.dispatchGraphBuiltOnce = Boolean(
      data.dispatchGraphBuiltOnce || data.dispatchGraphReady || data.dispatchGraphUrl,
    );
    if (state.taskPool?.tasks?.length) {
      state.recommendedWorkerCount = recommendWorkerCount(state.taskPool.tasks, {
        max: 4,
      });
    }
    renderWorkerCountList();
    syncOpenTaskGraphButton();
    applySavedCardFields(data.card, data.reviseCard);
    applyActiveModuleToFields();
    renderModuleTabs();
    syncTaskPoolPreview();
    // Prefer focused version card over flat reviseCard when history exists
    if (state.reviseCardFocus) {
      focusReviseCardVersion(state.reviseCardFocus);
    } else if (state.reviseDraft) {
      state.reviseCardFocus = Number(state.reviseDraft.revision) || null;
      applyReviseFieldsFromCard(state.reviseDraft);
      setReviseFieldsReadonly(state.mode !== "revise" || state.reviseLocked);
    } else if (state.lastRevision && Number(state.lastRevision.revision) > 0) {
      state.reviseCardFocus = Number(state.lastRevision.revision);
      const stored = getStoredReviseCard(state.reviseCardFocus);
      if (stored) applyReviseFieldsFromCard(stored);
    }
    setConfirmFieldsReadonly(
      activeModule()?.status === "confirmed" || modulesAllConfirmedLocal(),
    );
    setReviseFieldsReadonly(
      state.reviseLocked ||
        state.revisePlanConfirmed ||
        (Boolean(state.reviseCardFocus) &&
          !isReviseDraftFocus() &&
          Boolean(getStoredReviseCard(state.reviseCardFocus))),
    );
    applyConfirmCardChrome();
    applyCardChrome();
    syncReviseCardChrome();
    // Render the dialogue that matches desk mode (revise shows user turns).
    if (state.mode === "revise") {
      switchChatLogForMode("revise");
    } else if (state.mode === "architecture") {
      switchChatLogForMode("architecture");
    } else {
      renderMessagesToLog(state.messages);
      if (state.locked && !state.architecture.confirmed) {
        appendArchitectureMessagesToLog();
      }
    }
    restoreReviseDeskUi();
    restoreValidateGate(data.validate);
    if (
      state.architecture.url ||
      state.architecture.status !== "idle" ||
      (state.locked && !state.architecture.confirmed) ||
      (state.revisePlanConfirmed && !state.architecture.confirmed)
    ) {
      syncArchitecturePanel(
        state.revisePlanConfirmed && !state.architecture.confirmed
          ? undefined
          : state.locked && !state.architecture.confirmed
            ? "stale"
            : undefined,
      );
    }
    syncConfirmEnabled();
    syncComposerEnabled();
    if (modulesAllConfirmedLocal() && el.confirm) {
      el.confirm.textContent = t("card.allModulesConfirmed");
      el.confirm.disabled = true;
    }
    if (state.architecture.confirmed && modulesAllConfirmedLocal()) {
      if (el.dispatch) el.dispatch.hidden = false;
      syncDispatchProjectLine();
      syncTaskPoolPreview();
      syncOpenTaskGraphButton();
      void loadAgents();
    }
    if (state.dispatchPhase === "done") {
      syncDispatchButton();
    }
    if (state.jobId) {
      startStatusPoll();
      void loadAgents();
    }
    if (
      !modulesAllConfirmedLocal() &&
      activeModule()?.status !== "confirmed" &&
      state.mode === "specify"
    ) {
      scheduleValidate("confirm");
    }
    if (
      state.locked &&
      !state.architecture.confirmed &&
      state.mode !== "revise"
    ) {
      if (state.deskKind === "bug") {
        skipArchitectureForBug();
      } else {
        beginArchitectureDesign({
          kickoff: !state.architectureMessages.some((m) => m.role === "assistant"),
        });
        if (state.architectureMessages.some((m) => m.role === "assistant")) {
          maybeNudgeArchitectureContinue();
        }
      }
    }
    applyConfirmCardChrome();
    return state.messages.length;
  } catch {
    clearDeskWorkspace();
    return 0;
  }
}

async function sendChat(userText) {
  if (!state.projectPath) {
    explainChatBlocked();
    syncComposerEnabled();
    setHistoryOpen(true);
    return;
  }
  const bag =
    state.mode === "revise"
      ? state.reviseMessages
      : state.mode === "architecture"
        ? state.architectureMessages
        : state.messages;
  bag.push({ role: "user", content: userText });
  addBubble("user", userText);
  if (state.mode !== "revise" && state.mode !== "architecture" && !state.rawAsk) {
    state.rawAsk = userText;
  }
  if (state.mode === "specify" && !state.locked) {
    if (isBugIntentText(userText)) enterDeskKind("bug");
    else if (isFeatureIntentText(userText)) enterDeskKind("feature");
  }
  void persistProjectChat();

  setBusy(true);
  state.lastChatBlockMsg = "";
  const streamBubble = startStreamingBubble();
  const lockedSpecify = state.mode !== "revise" && state.mode !== "architecture" && state.locked;
  try {
    const history = bag.slice(-16);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: history,
        card: state.mode === "revise" ? reviseCardValues() : cardValues(),
        modules:
          state.mode === "revise" || state.mode === "architecture"
            ? undefined
            : state.modules,
        activeModuleId:
          state.mode === "revise" || state.mode === "architecture"
            ? undefined
            : state.activeModuleId,
        mode:
          state.mode === "revise"
            ? "revise"
            : state.mode === "architecture"
              ? "architecture"
              : "specify",
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        deployTarget: state.deployTarget || "none",
        projectPath: state.projectPath || undefined,
        previewUrl: state.lastPreviewUrl || undefined,
        stream: true,
      }),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok && !ctype.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}));
      if (data.code === "NEED_PROJECT") {
        setActiveProject(null);
        setHistoryOpen(true);
      }
      throw new Error(data.error || t("err.chat"));
    }

    if (ctype.includes("text/event-stream") && res.body) {
      let final = null;
      let streamError = null;
      await readChatStream(res, (evt) => {
        if (evt.type === "delta" && evt.text) streamBubble.append(evt.text);
        else if (evt.type === "done") final = evt;
        else if (evt.type === "error") {
          streamError = new Error(evt.error || t("err.chat"));
        }
      });
      if (streamError) throw streamError;
      if (!final) throw new Error(t("err.streamIncomplete"));
      if (state.mode !== "architecture") applyCard(final);
      if (final.reply) streamBubble.set(final.reply);
      streamBubble.finish(
        state.mode === "architecture"
          ? architectureContinueOptions(final)
          : final.options,
      );
      bag.push({ role: "assistant", content: final.reply });
      void persistProjectChat();
      if (state.mode === "architecture") {
        await finishArchitectureChatResult(final, streamBubble, bag);
      } else if (lockedSpecify && (final.goal || final.acceptance)) {
        addBubble("bot", t("bot.chatLockedHint"));
      } else if (final.ready) {
        addBubble(
          "bot",
          state.mode === "revise"
            ? t("bot.reviseCardReady")
            : t("bot.cardReady"),
        );
        if (state.mode === "revise") {
          focusRightPanel({ force: true });
        }
      }
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("err.chat"));
      if (state.mode !== "architecture") applyCard(data);
      streamBubble.set(data.reply || "");
      streamBubble.finish(
        state.mode === "architecture"
          ? architectureContinueOptions(data)
          : data.options,
      );
      bag.push({ role: "assistant", content: data.reply });
      void persistProjectChat();
      if (state.mode === "architecture") {
        await finishArchitectureChatResult(data, streamBubble, bag);
      } else if (lockedSpecify && (data.goal || data.acceptance)) {
        addBubble("bot", t("bot.chatLockedHint"));
      } else if (data.ready) {
        addBubble(
          "bot",
          state.mode === "revise"
            ? t("bot.reviseCardReady")
            : t("bot.cardReady"),
        );
        if (state.mode === "revise") {
          focusRightPanel({ force: true });
        }
      }
    }
  } catch (err) {
    bag.pop();
    streamBubble.set(
      t("bot.chatError", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
    streamBubble.finish();
  } finally {
    setBusy(false);
    syncConfirmEnabled();
  }
}

function applyCard(data, { skipValidate = false } = {}) {
  if (state.mode === "revise") {
    if (state.reviseLocked) {
      syncConfirmEnabled();
      return;
    }
    if (!state.reviseDraft) {
      state.reviseDraft = {
        revision: nextReviseRevisionNumber(),
        goal: "",
        outOfScope: "",
        acceptance: "",
        assumptions: "",
      };
      state.reviseCardFocus =
        state.reviseCardFocus || state.reviseDraft.revision;
    }
    if (data.goal) state.reviseDraft.goal = data.goal;
    if (data.outOfScope) state.reviseDraft.outOfScope = data.outOfScope;
    if (data.acceptance) state.reviseDraft.acceptance = data.acceptance;
    if (data.assumptions) state.reviseDraft.assumptions = data.assumptions;
    if (isReviseDraftFocus()) {
      applyReviseFieldsFromCard(state.reviseDraft);
    }
    syncReviseCardChrome({ rebuildAccordion: false });
  } else if (state.locked && modulesAllConfirmedLocal()) {
    // All modules confirmed — specify chat is conversational only.
    syncConfirmEnabled();
    return;
  } else {
    mergeModulesFromChatPayload(data);
  }
  syncReqSections();
  syncConfirmEnabled();
  if (!skipValidate) scheduleValidate(currentValidateKind());
}

function applyProvider(id, { fillEmptyOnly = false } = {}) {
  const preset =
    state.providers.find((p) => p.id === id) || FALLBACK_PROVIDERS[0];
  state.providerId = preset.id;
  for (const btn of el.cfgProviders.querySelectorAll(".provider-chip")) {
    btn.setAttribute(
      "aria-pressed",
      btn.dataset.id === preset.id ? "true" : "false",
    );
  }
  if (preset.id === "custom") return;
  if (!fillEmptyOnly || !el.cfgBase.value.trim()) {
    el.cfgBase.value = preset.baseUrl;
  }
  if (!fillEmptyOnly || !el.cfgModel.value.trim()) {
    el.cfgModel.value = preset.model;
  }
  el.cfgBase.placeholder = preset.baseUrl || "https://…";
  el.cfgModel.placeholder = preset.model || "model-id";
}

function renderProviders() {
  el.cfgProviders.replaceChildren();
  for (const p of state.providers) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "provider-chip";
    btn.dataset.id = p.id;
    btn.textContent = providerLabel(p);
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => applyProvider(p.id));
    el.cfgProviders.appendChild(btn);
  }
}

function syncDrawerBackdrop() {
  if (!el.historyBackdrop) return;
  const open =
    (el.historyPanel && !el.historyPanel.hidden) ||
    (el.settingsPanel && !el.settingsPanel.hidden) ||
    (el.employeePanel && !el.employeePanel.hidden);
  el.historyBackdrop.hidden = !open;
  document.body.classList.toggle("history-open", Boolean(open));
}

function setEmployeeOpen(open) {
  if (!el.employeePanel) return;
  const want = Boolean(open);
  if (want) {
    if (!state.ready) return;
    if (el.historyPanel && !el.historyPanel.hidden) {
      el.historyPanel.hidden = true;
      if (el.historyToggle) el.historyToggle.setAttribute("aria-expanded", "false");
    }
    if (el.settingsPanel && !el.settingsPanel.hidden) {
      el.settingsPanel.hidden = true;
      if (el.cfgOpen) el.cfgOpen.setAttribute("aria-expanded", "false");
    }
  }
  el.employeePanel.hidden = !want;
  if (el.employeeToggle) {
    el.employeeToggle.setAttribute("aria-expanded", want ? "true" : "false");
  }
  syncDrawerBackdrop();
  if (want) renderEmployeeList();
}

function renderEmployeeList() {
  if (!el.employeeList) return;
  el.employeeList.replaceChildren();
  for (const emp of EMPLOYEE_CATALOG) {
    const row = document.createElement("article");
    row.className = "employee-card";
    row.setAttribute("role", "listitem");
    const name = document.createElement("h3");
    name.className = "employee-name";
    name.textContent = t(`employee.${emp.id}.name`);
    const role = document.createElement("p");
    role.className = "employee-role meta";
    role.textContent = t("employee.role", { role: emp.role });
    const cap = document.createElement("p");
    cap.className = "employee-cap";
    cap.textContent = t(`employee.${emp.id}.cap`);
    const runtime = document.createElement("p");
    runtime.className = "hint tight";
    runtime.textContent = t("employee.runtime");
    row.append(name, role, cap, runtime);
    el.employeeList.appendChild(row);
  }
}

function setSettingsOpen(open) {
  if (!el.settingsPanel) return;
  const want = Boolean(open);
  if (want && el.historyPanel && !el.historyPanel.hidden) {
    el.historyPanel.hidden = true;
    if (el.historyToggle) {
      el.historyToggle.setAttribute("aria-expanded", "false");
    }
  }
  if (want && el.employeePanel && !el.employeePanel.hidden) {
    el.employeePanel.hidden = true;
    if (el.employeeToggle) {
      el.employeeToggle.setAttribute("aria-expanded", "false");
    }
  }
  el.settingsPanel.hidden = !want;
  if (el.cfgOpen) {
    el.cfgOpen.setAttribute("aria-expanded", want ? "true" : "false");
  }
  if (el.settingsClose) {
    el.settingsClose.hidden = false;
  }
  syncDrawerBackdrop();
}

function fillAliyunFields(cfg) {
  if (el.cfgAliyunId) {
    el.cfgAliyunId.value = "";
    el.cfgAliyunId.placeholder = cfg?.hasAliyunCredentials
      ? t("setup.aliyunIdSaved")
      : "LTAI…";
  }
  if (el.cfgAliyunSecret) {
    el.cfgAliyunSecret.value = "";
    el.cfgAliyunSecret.placeholder = cfg?.hasAliyunCredentials
      ? t("setup.keySaved")
      : "";
  }
  if (el.aliyunCfgMsg) el.aliyunCfgMsg.hidden = true;
}

function fillCloudflareFields(cfg) {
  if (el.cfgCfToken) {
    el.cfgCfToken.value = "";
    el.cfgCfToken.placeholder = cfg?.hasCloudflareCredentials
      ? t("setup.cloudflareTokenSaved")
      : "";
  }
  if (el.cfgCfAccount) {
    el.cfgCfAccount.value = "";
    el.cfgCfAccount.placeholder = cfg?.hasCloudflareCredentials
      ? t("setup.cloudflareAccountSaved")
      : "";
  }
  if (el.cfCfgMsg) el.cfCfgMsg.hidden = true;
}

function fillSttFields(cfg) {
  if (el.cfgSttBase) el.cfgSttBase.value = cfg?.sttBaseUrl || "";
  if (el.cfgSttModel) el.cfgSttModel.value = cfg?.sttModel || "";
  if (el.cfgSttKey) {
    el.cfgSttKey.value = "";
    el.cfgSttKey.placeholder = cfg?.hasSttApiKey ? t("setup.keySaved") : "sk-…";
  }
  if (el.sttCfgMsg) el.sttCfgMsg.hidden = true;
}

function fillAwsFields(cfg) {
  if (el.cfgAwsId) {
    el.cfgAwsId.value = "";
    el.cfgAwsId.placeholder = cfg?.hasAwsCredentials
      ? t("setup.awsIdSaved")
      : "AKIA…";
  }
  if (el.cfgAwsSecret) {
    el.cfgAwsSecret.value = "";
    el.cfgAwsSecret.placeholder = cfg?.hasAwsCredentials
      ? t("setup.keySaved")
      : "";
  }
  if (el.cfgAwsRegion) {
    el.cfgAwsRegion.value = "";
    el.cfgAwsRegion.placeholder = "us-east-1";
  }
  if (el.awsCfgMsg) el.awsCfgMsg.hidden = true;
}

function syncGatedDeployTarget(cfg) {
  const gated = {
    aliyun: Boolean(cfg?.hasAliyunCredentials),
    cloudflare: Boolean(cfg?.hasCloudflareCredentials),
    aws: Boolean(cfg?.hasAwsCredentials),
  };
  if (gated[state.deployTarget] === false) {
    state.deployTarget = "none";
  }
}

function showSetup(cfg) {
  state.lastCfg = { ...(cfg || {}), ready: Boolean(cfg?.ready) };
  if (Array.isArray(cfg?.providers) && cfg.providers.length) {
    state.providers = cfg.providers.map((p) => ({ ...p }));
  }
  renderProviders();
  el.cfgBase.value = cfg?.baseUrl || "";
  el.cfgModel.value = cfg?.model || "";
  el.cfgKey.value = "";
  el.cfgKey.placeholder = cfg?.hasApiKey ? t("setup.keySaved") : "sk-…";
  fillAliyunFields(cfg);
  fillCloudflareFields(cfg);
  fillAwsFields(cfg);
  fillSttFields(cfg);
  const id = cfg?.provider || "deepseek";
  applyProvider(id, { fillEmptyOnly: Boolean(cfg?.baseUrl || cfg?.model) });
  // Always show the desk; open Settings so the operator can fill the model.
  if (el.desk) el.desk.hidden = false;
  state.ready = false;
  syncComposerEnabled();
  setSettingsOpen(true);
  if (el.meta) {
    el.meta.textContent = t("setup.hintOpenSettings");
  }
}

function showDesk(cfg) {
  if (el.desk) el.desk.hidden = false;
  state.ready = true;
  state.lastCfg = { ...cfg, ready: true };
  setSettingsOpen(false);
  syncGatedDeployTarget(cfg);
  renderDeployTargetList();
  fillSttFields(cfg);
  if (el.projectsRoot) {
    el.projectsRoot.value = cfg.projectsRoot || el.projectsRoot.value || "";
  }
  // Always resolve project from server; never leave composer open without one.
  if (cfg.activeProjectPath) {
    setActiveProject(cfg.activeProjectPath);
  } else {
    setActiveProject(null);
  }
  el.meta.textContent = t("meta.model", {
    model: cfg.model,
    jobs: cfg.jobsRoot || "~/.duaer/live/jobs",
  });
  syncConfirmEnabled();
  syncComposerEnabled();
  if (!state.projectPath) {
    if (!state.messages.length) {
      addBubble("bot", t("bot.needProject"));
    }
    setHistoryOpen(true);
  }
  void (async () => {
    await hydrateActiveProjectMeta();
    if (state.projectPath) {
      const n = await loadProjectChatIntoUi(state.projectPath);
      const hasDesk =
        n > 0 ||
        Boolean(state.jobId) ||
        Boolean((el.goal?.value || "").trim());
      if (!hasDesk) {
        addBubble("bot", t("bot.ready"), {
          options: [
            t("chat.optFeature"),
            t("chat.optChange"),
            t("chat.optBug"),
            t("chat.optScript"),
          ],
        });
      }
    }
  })();
}

async function hydrateActiveProjectMeta() {
  if (!state.projectPath) return;
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    if (!res.ok) return;
    state.projects = data.projects || [];
    const active = normalizePathKey(state.projectPath);
    const row = state.projects.find(
      (p) => normalizePathKey(p.path) === active,
    );
    if (row) {
      setActiveProject(row.path, row.title || row.name, row.description);
    } else if (!data.activeProjectPath) {
      // Server dropped active project — lock chat
      setActiveProject(null);
      setHistoryOpen(true);
    }
  } catch {
    /* ignore */
  }
}

function formatStarCount(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "—";
  if (n < 1000) return String(Math.floor(n));
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}

async function refreshGithubStars({ force = false } = {}) {
  if (!el.githubStars || !el.githubStarCount) return;
  try {
    const q = force ? "?force=1" : "";
    const res = await fetch(`/api/github${q}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "github");
    if (data.url) el.githubStars.href = data.url;
    el.githubStarCount.textContent = formatStarCount(data.stars);
    if (typeof data.stars === "number") {
      el.githubStars.title = `${data.fullName || "GitHub"} · ★ ${data.stars}`;
    }
  } catch {
    /* keep last / fallback dash */
  }
}

let githubStarsTimer = null;
let githubVisibilityWired = false;
function startGithubStarsPolling() {
  void refreshGithubStars();
  if (githubStarsTimer) clearInterval(githubStarsTimer);
  githubStarsTimer = setInterval(() => {
    void refreshGithubStars();
  }, 5 * 60 * 1000);
  if (!githubVisibilityWired) {
    githubVisibilityWired = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refreshGithubStars();
    });
  }
}

async function loadConfig() {
  const res = await fetch("/api/health");
  const cfg = await res.json();
  showUpdateNotice(cfg.update);
  if (cfg.ready) showDesk(cfg);
  else showSetup(cfg);
  applyOpenPanelFromQuery();
}

/** From dispatch-center top nav: /?open=projects|employees|settings */
function applyOpenPanelFromQuery() {
  const u = new URL(location.href);
  const open = String(u.searchParams.get("open") || "").trim();
  if (!open) return;
  u.searchParams.delete("open");
  history.replaceState(null, "", u);
  if (open === "projects") setHistoryOpen(true);
  else if (open === "employees") setEmployeeOpen(true);
  else if (open === "settings") setSettingsOpen(true);
}

el.saveCfg.addEventListener("click", async () => {
  el.cfgErr.hidden = true;
  const body = {
    baseUrl: el.cfgBase.value.trim(),
    model: el.cfgModel.value.trim(),
  };
  const key = el.cfgKey.value.trim();
  if (key) body.apiKey = key;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
    showDesk(data);
  } catch (err) {
    el.cfgErr.hidden = false;
    el.cfgErr.textContent = err instanceof Error ? err.message : String(err);
  }
});

async function saveSttCredentials({ clear = false } = {}) {
  if (el.sttCfgMsg) el.sttCfgMsg.hidden = true;
  if (clear) {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearStt: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
      state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
      fillSttFields(data);
      if (el.sttCfgMsg) {
        el.sttCfgMsg.hidden = false;
        el.sttCfgMsg.textContent = t("setup.sttCleared");
      }
    } catch (err) {
      if (el.sttCfgMsg) {
        el.sttCfgMsg.hidden = false;
        el.sttCfgMsg.textContent =
          err instanceof Error ? err.message : String(err);
      }
    }
    return;
  }
  const baseUrl = el.cfgSttBase?.value.trim() || "";
  const model = el.cfgSttModel?.value.trim() || "";
  const key = el.cfgSttKey?.value.trim() || "";
  const had = Boolean(state.lastCfg?.hasSttApiKey);
  if (!baseUrl || !model) {
    if (el.sttCfgMsg) {
      el.sttCfgMsg.hidden = false;
      el.sttCfgMsg.textContent = t("setup.sttNeedFields");
    }
    return;
  }
  if (!had && !key) {
    if (el.sttCfgMsg) {
      el.sttCfgMsg.hidden = false;
      el.sttCfgMsg.textContent = t("setup.sttNeedFields");
    }
    return;
  }
  const body = { sttBaseUrl: baseUrl, sttModel: model };
  if (key) body.sttApiKey = key;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
    state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
    fillSttFields(data);
    if (el.sttCfgMsg) {
      el.sttCfgMsg.hidden = false;
      el.sttCfgMsg.textContent = t("setup.sttSaved");
    }
  } catch (err) {
    if (el.sttCfgMsg) {
      el.sttCfgMsg.hidden = false;
      el.sttCfgMsg.textContent =
        err instanceof Error ? err.message : String(err);
    }
  }
}

el.saveSttCfg?.addEventListener("click", () => {
  void saveSttCredentials();
});
el.clearSttCfg?.addEventListener("click", () => {
  void saveSttCredentials({ clear: true });
});

async function saveAliyunCredentials({ clear = false } = {}) {
  if (el.aliyunCfgMsg) el.aliyunCfgMsg.hidden = true;
  if (clear) {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearAliyunCredentials: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
      state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
      fillAliyunFields(data);
      if (state.deployTarget === "aliyun") state.deployTarget = "none";
      renderDeployTargetList();
      if (el.aliyunCfgMsg) {
        el.aliyunCfgMsg.hidden = false;
        el.aliyunCfgMsg.textContent = t("setup.aliyunCleared");
      }
    } catch (err) {
      if (el.aliyunCfgMsg) {
        el.aliyunCfgMsg.hidden = false;
        el.aliyunCfgMsg.textContent =
          err instanceof Error ? err.message : String(err);
      }
    }
    return;
  }

  const id = el.cfgAliyunId?.value.trim() || "";
  const secret = el.cfgAliyunSecret?.value.trim() || "";
  const had = Boolean(state.lastCfg?.hasAliyunCredentials);
  if (!id && !secret) {
    if (el.aliyunCfgMsg) {
      el.aliyunCfgMsg.hidden = false;
      el.aliyunCfgMsg.textContent = had
        ? t("setup.aliyunSaved")
        : t("setup.aliyunNeedBoth");
    }
    return;
  }
  if (!had && (!id || !secret)) {
    if (el.aliyunCfgMsg) {
      el.aliyunCfgMsg.hidden = false;
      el.aliyunCfgMsg.textContent = t("setup.aliyunNeedBoth");
    }
    return;
  }
  const body = {};
  if (id) body.aliyunAccessKeyId = id;
  if (secret) body.aliyunAccessKeySecret = secret;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
    state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
    fillAliyunFields(data);
    if (state.deployTarget === "aliyun" && !data.hasAliyunCredentials) {
      state.deployTarget = "none";
    }
    renderDeployTargetList();
    if (el.aliyunCfgMsg) {
      el.aliyunCfgMsg.hidden = false;
      el.aliyunCfgMsg.textContent = t("setup.aliyunSaved");
    }
  } catch (err) {
    if (el.aliyunCfgMsg) {
      el.aliyunCfgMsg.hidden = false;
      el.aliyunCfgMsg.textContent =
        err instanceof Error ? err.message : String(err);
    }
  }
}

el.saveAliyunCfg?.addEventListener("click", () => {
  void saveAliyunCredentials({ clear: false });
});
el.clearAliyunCfg?.addEventListener("click", () => {
  void saveAliyunCredentials({ clear: true });
});

async function saveCloudflareCredentials({ clear = false } = {}) {
  if (el.cfCfgMsg) el.cfCfgMsg.hidden = true;
  if (clear) {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearCloudflareCredentials: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
      state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
      fillCloudflareFields(data);
      syncGatedDeployTarget(data);
      renderDeployTargetList();
      if (el.cfCfgMsg) {
        el.cfCfgMsg.hidden = false;
        el.cfCfgMsg.textContent = t("setup.cloudflareCleared");
      }
    } catch (err) {
      if (el.cfCfgMsg) {
        el.cfCfgMsg.hidden = false;
        el.cfCfgMsg.textContent =
          err instanceof Error ? err.message : String(err);
      }
    }
    return;
  }
  const token = el.cfgCfToken?.value.trim() || "";
  const account = el.cfgCfAccount?.value.trim() || "";
  const had = Boolean(state.lastCfg?.hasCloudflareCredentials);
  if (!token && !account) {
    if (el.cfCfgMsg) {
      el.cfCfgMsg.hidden = false;
      el.cfCfgMsg.textContent = had
        ? t("setup.cloudflareSaved")
        : t("setup.cloudflareNeedBoth");
    }
    return;
  }
  if (!had && (!token || !account)) {
    if (el.cfCfgMsg) {
      el.cfCfgMsg.hidden = false;
      el.cfCfgMsg.textContent = t("setup.cloudflareNeedBoth");
    }
    return;
  }
  const body = {};
  if (token) body.cloudflareApiToken = token;
  if (account) body.cloudflareAccountId = account;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
    state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
    fillCloudflareFields(data);
    syncGatedDeployTarget(data);
    renderDeployTargetList();
    if (el.cfCfgMsg) {
      el.cfCfgMsg.hidden = false;
      el.cfCfgMsg.textContent = t("setup.cloudflareSaved");
    }
  } catch (err) {
    if (el.cfCfgMsg) {
      el.cfCfgMsg.hidden = false;
      el.cfCfgMsg.textContent =
        err instanceof Error ? err.message : String(err);
    }
  }
}

el.saveCfCfg?.addEventListener("click", () => {
  void saveCloudflareCredentials({ clear: false });
});
el.clearCfCfg?.addEventListener("click", () => {
  void saveCloudflareCredentials({ clear: true });
});

async function saveAwsCredentials({ clear = false } = {}) {
  if (el.awsCfgMsg) el.awsCfgMsg.hidden = true;
  if (clear) {
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clearAwsCredentials: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
      state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
      fillAwsFields(data);
      syncGatedDeployTarget(data);
      renderDeployTargetList();
      if (el.awsCfgMsg) {
        el.awsCfgMsg.hidden = false;
        el.awsCfgMsg.textContent = t("setup.awsCleared");
      }
    } catch (err) {
      if (el.awsCfgMsg) {
        el.awsCfgMsg.hidden = false;
        el.awsCfgMsg.textContent =
          err instanceof Error ? err.message : String(err);
      }
    }
    return;
  }
  const id = el.cfgAwsId?.value.trim() || "";
  const secret = el.cfgAwsSecret?.value.trim() || "";
  const region = el.cfgAwsRegion?.value.trim() || "";
  const had = Boolean(state.lastCfg?.hasAwsCredentials);
  if (!id && !secret && !region) {
    if (el.awsCfgMsg) {
      el.awsCfgMsg.hidden = false;
      el.awsCfgMsg.textContent = had
        ? t("setup.awsSaved")
        : t("setup.awsNeedBoth");
    }
    return;
  }
  if (!had && (!id || !secret)) {
    if (el.awsCfgMsg) {
      el.awsCfgMsg.hidden = false;
      el.awsCfgMsg.textContent = t("setup.awsNeedBoth");
    }
    return;
  }
  const body = {};
  if (id) body.awsAccessKeyId = id;
  if (secret) body.awsSecretAccessKey = secret;
  if (region || had) body.awsRegion = region;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("setup.saveFail"));
    state.lastCfg = { ...(state.lastCfg || {}), ...data, ready: state.ready };
    fillAwsFields(data);
    syncGatedDeployTarget(data);
    renderDeployTargetList();
    if (el.awsCfgMsg) {
      el.awsCfgMsg.hidden = false;
      el.awsCfgMsg.textContent = t("setup.awsSaved");
    }
  } catch (err) {
    if (el.awsCfgMsg) {
      el.awsCfgMsg.hidden = false;
      el.awsCfgMsg.textContent =
        err instanceof Error ? err.message : String(err);
    }
  }
}

el.saveAwsCfg?.addEventListener("click", () => {
  void saveAwsCredentials({ clear: false });
});
el.clearAwsCfg?.addEventListener("click", () => {
  void saveAwsCredentials({ clear: true });
});

el.cfgOpen?.addEventListener("click", () => {
  const open = el.settingsPanel?.hidden !== false;
  if (open) {
    showSetup({
      ...(state.lastCfg || {}),
      providers: state.providers,
      provider: state.providerId || state.lastCfg?.provider,
    });
  } else if (state.ready) {
    setSettingsOpen(false);
  }
});

el.settingsClose?.addEventListener("click", () => {
  if (state.ready) setSettingsOpen(false);
});

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!chatAllowed()) {
    explainChatBlocked();
    syncComposerEnabled();
    return;
  }
  const text = el.input.value.trim();
  if (!text) return;
  stopVoiceInput({ keepLabel: true });
  el.input.value = "";
  void sendChat(text);
});

/** @type {MediaRecorder|null} */
let voiceMediaRecorder = null;
/** @type {MediaStream|null} */
let voiceMediaStream = null;
/** @type {Blob[]} */
let voiceMediaChunks = [];
let voiceBaseText = "";
let voiceListening = false;
let voiceTranscribing = false;

function sttLanguageCode() {
  const loc = getLocale();
  if (loc === "zh-CN" || loc === "zh-TW") return "zh";
  if (loc === "pt-BR") return "pt";
  return String(loc || "zh").split("-")[0] || "zh";
}

function sttConfigured() {
  return Boolean(state.lastCfg?.sttReady);
}

function syncVoiceButtonUi() {
  if (!el.voice) return;
  const active = voiceListening || voiceTranscribing;
  el.voice.setAttribute("aria-pressed", active ? "true" : "false");
  if (voiceTranscribing) {
    el.voice.textContent = t("chat.voiceRecognizing");
  } else if (voiceListening) {
    el.voice.textContent = t("chat.voiceListening");
  } else {
    el.voice.textContent = t("chat.voice");
  }
  el.voice.title = sttConfigured()
    ? t("chat.voiceHintStt")
    : t("chat.voiceHint");
}

function releaseVoiceMedia() {
  if (voiceMediaRecorder) {
    try {
      voiceMediaRecorder.ondataavailable = null;
      voiceMediaRecorder.onstop = null;
      voiceMediaRecorder.onerror = null;
      if (voiceMediaRecorder.state !== "inactive") voiceMediaRecorder.stop();
    } catch {
      /* ignore */
    }
    voiceMediaRecorder = null;
  }
  if (voiceMediaStream) {
    for (const track of voiceMediaStream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    }
    voiceMediaStream = null;
  }
  voiceMediaChunks = [];
}

function stopVoiceInput({ keepLabel = false } = {}) {
  releaseVoiceMedia();
  voiceListening = false;
  voiceTranscribing = false;
  if (!keepLabel) syncVoiceButtonUi();
  else if (el.voice) {
    el.voice.setAttribute("aria-pressed", "false");
    el.voice.textContent = t("chat.voice");
  }
}

function appendVoiceTranscript(chunk, { final: isFinal } = {}) {
  if (!el.input || !chunk) return;
  const piece = String(chunk).trim();
  if (!piece) return;
  const base = voiceBaseText;
  const sep = base && !/\s$/.test(base) ? " " : "";
  el.input.value = `${base}${sep}${piece}`;
  if (isFinal) {
    voiceBaseText = el.input.value.trim();
    if (voiceBaseText) voiceBaseText += " ";
  }
  try {
    el.input.focus();
    el.input.setSelectionRange(el.input.value.length, el.input.value.length);
  } catch {
    /* ignore */
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

async function transcribeVoiceBlob(blob) {
  const audioBase64 = await blobToBase64(blob);
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || "audio/webm",
      language: sttLanguageCode(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.code === "NEED_STT" || res.status === 400) {
      throw new Error(t("chat.voiceNeedStt"));
    }
    throw new Error(
      String(data.error || t("chat.voiceError", { msg: `HTTP ${res.status}` })),
    );
  }
  const text = String(data.text || "").trim();
  if (!text) throw new Error(t("chat.voiceEmpty"));
  return text;
}

async function finishMediaRecordAndTranscribe() {
  const recorder = voiceMediaRecorder;
  if (!recorder) {
    voiceListening = false;
    syncVoiceButtonUi();
    return;
  }
  const blob = await new Promise((resolve) => {
    const finish = () => {
      const type = recorder.mimeType || "audio/webm";
      resolve(new Blob(voiceMediaChunks.slice(), { type }));
    };
    if (recorder.state === "inactive") {
      finish();
      return;
    }
    recorder.onstop = finish;
    try {
      recorder.stop();
    } catch {
      finish();
    }
  });
  if (voiceMediaStream) {
    for (const track of voiceMediaStream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    }
    voiceMediaStream = null;
  }
  voiceMediaRecorder = null;
  voiceMediaChunks = [];
  voiceListening = false;
  if (!blob.size) {
    syncVoiceButtonUi();
    addBubble("bot", t("chat.voiceEmpty"));
    return;
  }
  voiceTranscribing = true;
  syncVoiceButtonUi();
  try {
    voiceBaseText = String(el.input?.value || "").trim();
    if (voiceBaseText) voiceBaseText += " ";
    const text = await transcribeVoiceBlob(blob);
    appendVoiceTranscript(text, { final: true });
  } catch (err) {
    addBubble(
      "bot",
      t("chat.voiceError", {
        msg: err instanceof Error ? err.message : String(err || "stt"),
      }),
    );
  } finally {
    voiceTranscribing = false;
    syncVoiceButtonUi();
  }
}

async function startMediaRecord() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    addBubble("bot", t("chat.voiceUnsupported"));
    return;
  }
  if (!state.ready || !state.projectPath || state.busy) {
    explainChatBlocked();
    return;
  }
  stopVoiceInput({ keepLabel: true });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceMediaStream = stream;
    voiceMediaChunks = [];
    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    voiceMediaRecorder = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size) voiceMediaChunks.push(ev.data);
    };
    recorder.onerror = () => {
      stopVoiceInput();
      addBubble("bot", t("chat.voiceError", { msg: "recorder" }));
    };
    recorder.start(250);
    voiceListening = true;
    syncVoiceButtonUi();
  } catch (err) {
    releaseVoiceMedia();
    voiceListening = false;
    syncVoiceButtonUi();
    const name = err instanceof Error ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      addBubble("bot", t("chat.voiceDenied"));
    } else {
      addBubble(
        "bot",
        t("chat.voiceError", {
          msg: err instanceof Error ? err.message : String(err || "mic"),
        }),
      );
    }
  }
}

function guideVoiceToSttSettings() {
  addBubble("bot", t("chat.voiceNeedStt"));
  setSettingsOpen(true);
  const block = document.getElementById("setupSttBlock");
  if (block instanceof HTMLDetailsElement) {
    block.open = true;
    try {
      block.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }
  try {
    (el.cfgSttBase || el.cfgSttModel)?.focus();
  } catch {
    /* ignore */
  }
}

function toggleVoiceInput() {
  if (voiceTranscribing) return;
  if (voiceListening) {
    if (voiceMediaRecorder) {
      void finishMediaRecordAndTranscribe();
      return;
    }
    stopVoiceInput();
    return;
  }
  if (!sttConfigured()) {
    guideVoiceToSttSettings();
    return;
  }
  void startMediaRecord();
}

el.voice?.addEventListener("click", () => {
  toggleVoiceInput();
});

if (el.input) {
  el.input.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" || ev.shiftKey || ev.isComposing) return;
    ev.preventDefault();
    if (!chatAllowed()) {
      explainChatBlocked();
      syncComposerEnabled();
      return;
    }
    const text = el.input.value.trim();
    if (!text) return;
    stopVoiceInput({ keepLabel: true });
    el.input.value = "";
    void sendChat(text);
  });
}

el.confirm.addEventListener("click", async () => {
  if (state.mode === "revise") {
    void confirmReviseAndDispatch();
    return;
  }
  const v = cardValues();
  syncActiveModuleCardFromFields();
  const active = activeModule();
  if (
    !v.goal ||
    !v.acceptance ||
    active?.status === "confirmed" ||
    modulesAllConfirmedLocal() ||
    state.busy
  ) {
    return;
  }
  if (!validationAllowsSend("confirm")) {
    scheduleValidate("confirm");
    addBubble("bot", t("bot.needValidate"));
    return;
  }
  el.confirm.disabled = true;
  el.confirm.textContent = t("card.accepting");
  setBusy(true);
  try {
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...v,
        moduleId: state.activeModuleId || active?.id || "main",
        activeModuleId: state.activeModuleId || active?.id || "main",
        modules: state.modules,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        rawAsk: state.rawAsk || v.goal,
        projectPath: state.projectPath || undefined,
        repoPath: state.projectPath || undefined,
        previewUrl: state.lastPreviewUrl || undefined,
      }),
    });
    const data = await res.json();
    if (data.card) applyCard(data.card, { skipValidate: true });
    if (res.status === 422 || data.passed === false) {
      state.validate = {
        kind: "confirm",
        fingerprint: cardFingerprint(cardValues()),
        status: "failed",
        summary: data.summary || data.error || "",
        issues: Array.isArray(data.issues) ? data.issues : [],
      };
      renderValidateHint();
      showAcceptFailed(data, { kind: "confirm" });
      el.confirm.disabled = false;
      el.confirm.textContent = t("card.confirm");
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || t("err.confirm"));
    resetValidateGate();
    await applyConfirmSuccess(data);
  } catch (err) {
    el.confirm.disabled = false;
    el.confirm.textContent = t("card.confirm");
    addBubble(
      "bot",
      t("bot.confirmFail", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
  } finally {
    setBusy(false);
    syncConfirmEnabled();
  }
});

function showAcceptFailed(data, { kind = "confirm" } = {}) {
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const detail = issues.length ? `\n- ${issues.join("\n- ")}` : "";
  addBubble(
    "bot",
    t("bot.acceptFailed", {
      summary: data.summary || data.error || t("bot.acceptFailedDefault"),
      detail,
    }),
    {
      actions: [
        {
          label: t("bot.autoFix"),
          onClick: (btn) => autoFixAccept(btn, issues, kind),
        },
      ],
    },
  );
}

/** Gate-side Auto-handle: fix card via validate/fix and narrate in chat. */
async function autoHandleFromGate(kind, btn) {
  if (state.busy || !state.ready) return;
  if (state.validate.status !== "failed") return;
  if (kind === "confirm" && state.locked) return;
  if (kind === "revise" && state.reviseLocked) return;
  const issues = Array.isArray(state.validate.issues)
    ? state.validate.issues
    : [];
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  setBusy(true);
  syncAutoHandleButtons();
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("card.autoHandling");
  }
  addBubble("bot", t("bot.autoHandleStart"));
  try {
    const res = await fetch("/api/validate/fix", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...v,
        issues,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        projectPath: state.projectPath || undefined,
        previewUrl: state.lastPreviewUrl || undefined,
      }),
    });
    const data = await res.json();
    if (data.card) applyCard(data.card, { skipValidate: true });
    const next = kind === "revise" ? reviseCardValues() : cardValues();
    const passed = Boolean(data.passed) && res.ok;
    state.validate = {
      kind,
      fingerprint: cardFingerprint(next),
      status: passed ? "passed" : "failed",
      summary: data.summary || data.error || "",
      issues: Array.isArray(data.issues) ? data.issues : [],
    };
    renderValidateHint();
    if (passed) {
      addBubble(
        "bot",
        t("bot.validateFixed", {
          summary: data.fixSummary || data.summary || "",
        }),
      );
    } else {
      const note = data.fixSummary ? `（${data.fixSummary}）` : "";
      addBubble("bot", t("bot.fixStillFailed", { note }));
      showAcceptFailed(data, { kind });
    }
  } catch (err) {
    addBubble(
      "bot",
      t("bot.autoFixFail", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
  } finally {
    setBusy(false);
    if (btn) {
      btn.disabled = false;
      btn.textContent = t("card.autoHandle");
    }
    syncConfirmEnabled();
    syncAutoHandleButtons();
  }
}

async function applyConfirmSuccess(data) {
  if (Array.isArray(data.modules) && data.modules.length) {
    state.modules = data.modules.map((m) => ({
      id: String(m.id),
      title: String(m.title || m.id),
      status: m.status === "confirmed" ? "confirmed" : String(m.status || "draft"),
      card: {
        goal: String(m.card?.goal || m.goal || ""),
        outOfScope: String(m.card?.outOfScope || m.outOfScope || ""),
        acceptance: String(m.card?.acceptance || m.acceptance || ""),
        assumptions: String(m.card?.assumptions || m.assumptions || ""),
        deviceMatrix: String(m.card?.deviceMatrix || m.deviceMatrix || ""),
        criticalPaths: String(m.card?.criticalPaths || m.criticalPaths || ""),
        exceptionCases: String(m.card?.exceptionCases || m.exceptionCases || ""),
        apiContract: String(m.card?.apiContract || m.apiContract || ""),
        envChecklist: String(m.card?.envChecklist || m.envChecklist || ""),
        dataPrecheck: String(m.card?.dataPrecheck || m.dataPrecheck || ""),
        externalDeps: String(m.card?.externalDeps || m.externalDeps || ""),
        perfBudget: String(m.card?.perfBudget || m.perfBudget || ""),
      },
      dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn.map(String) : [],
    }));
  }
  if (data.activeModuleId || data.moduleId) {
    state.activeModuleId = String(data.activeModuleId || data.moduleId);
  }
  if (data.card) {
    const m = activeModule();
    if (m) {
      m.status = "confirmed";
      m.card = {
        goal: data.card.goal || "",
        outOfScope: data.card.outOfScope || "",
        acceptance: data.card.acceptance || "",
        assumptions: data.card.assumptions || "",
        deviceMatrix: data.card.deviceMatrix || "",
        criticalPaths: data.card.criticalPaths || "",
        exceptionCases: data.card.exceptionCases || "",
        apiContract: data.card.apiContract || "",
        envChecklist: data.card.envChecklist || "",
        dataPrecheck: data.card.dataPrecheck || "",
        externalDeps: data.card.externalDeps || "",
        perfBudget: data.card.perfBudget || "",
      };
    }
    applyActiveModuleToFields();
  }
  const allDone = Boolean(data.modulesAllConfirmed) || modulesAllConfirmedLocal();
  state.locked = allDone;
  // Brief is written at kickoff — do not set jobId from module confirm.
  if (data.jobId) state.jobId = data.jobId;
  state.originalCard = allDone
    ? {
        goal: state.modules.map((m) => `[${m.title}] ${m.card.goal}`).join("\n"),
        outOfScope: state.modules
          .map((m) => m.card.outOfScope)
          .filter(Boolean)
          .join("\n"),
        acceptance: state.modules
          .map((m) => `[${m.title}] ${m.card.acceptance}`)
          .join("\n"),
        assumptions: state.modules
          .map((m) => m.card.assumptions)
          .filter(Boolean)
          .join("\n"),
      }
    : cardValues();
  clearRunTimeline();
  const done = state.modules.filter((m) => m.status === "confirmed").length;
  const total = state.modules.length;
  const extra = allDone
    ? t("result.allModulesExtra")
    : t("result.moduleExtra", { done: String(done), total: String(total) });
  if (!allDone) {
    focusNextUnconfirmedModule();
  }
  el.confirm.textContent = allDone
    ? t("card.allModulesConfirmed")
    : t("card.confirm");
  syncReviseCardChrome();
  el.result.hidden = false;
  const reviewLine = data.review?.summary
    ? t("result.review", { summary: data.review.summary })
    : data.fixSummary
      ? t("result.fix", { summary: data.fixSummary })
      : "";
  el.result.textContent = t("result.confirmOk", {
    review: reviewLine,
    extra,
    dir: data.relativeDir || "",
    branch: data.branch || "",
  });
  addBubble(
    "bot",
    allDone
      ? t("bot.allModulesOk")
      : data.fixed
        ? t("bot.confirmFixed")
        : t("bot.confirmOk"),
  );
  renderModuleTabs();
  syncConfirmEnabled();
  if (!allDone) {
    scheduleValidate("confirm");
  }
  void persistProjectChat();
  if (allDone) {
    if (state.deskKind === "bug" || data.needDispatch) {
      appendBugCardEntry(cardValues());
      skipArchitectureForBug();
      addBubble("bot", t("bot.bugReadyDispatch"));
    } else {
      beginArchitectureDesign({ kickoff: true });
    }
  }
}

function resetArchitecture({ stale = false } = {}) {
  state.architecture = {
    status: "idle",
    ir: null,
    viewBox: null,
    fingerprint: "",
    url: null,
    summary: "",
    confirmed: false,
  };
  state.architecturePrevious = null;
  state.architectureMessages = [];
  syncArchitecturePanel(stale ? "stale" : "need");
}

/** Structural fingerprint — ignore layout coords so redraws of the same map match. */
function architectureFingerprint(ir) {
  if (!ir || typeof ir !== "object") return "";
  try {
    const comps = (Array.isArray(ir.components) ? ir.components : [])
      .slice(0, 200)
      .map((c) => ({
        id: String(c?.id || "").slice(0, 80),
        type: String(c?.type || "").slice(0, 40),
        label: String(c?.label || c?.name || "").slice(0, 120),
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const links = (
      Array.isArray(ir.connections)
        ? ir.connections
        : Array.isArray(ir.links)
          ? ir.links
          : []
    )
      .slice(0, 400)
      .map((l) => ({
        from: String(l?.from || l?.source || "").slice(0, 80),
        to: String(l?.to || l?.target || "").slice(0, 80),
        label: String(l?.label || "").slice(0, 80),
      }))
      .sort((a, b) =>
        `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`),
      );
    return JSON.stringify({
      diagram_type: ir.diagram_type || "architecture",
      comps,
      links,
    });
  } catch {
    return "";
  }
}

/** Prefer stored fingerprint; fall back to hashing ir when still present. */
function architectureFpOf(arch) {
  if (!arch) return "";
  const stored = String(arch.fingerprint || "");
  if (stored) return stored;
  return architectureFingerprint(arch.ir) || "";
}

function normalizeViewBox(raw) {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const w = Number(raw[0]);
  const h = Number(raw[1]);
  if (!(w > 0) || !(h > 0) || !Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }
  return [w, h];
}

function architectureViewBoxOf(archOrIr) {
  if (!archOrIr) return null;
  if (Array.isArray(archOrIr)) return normalizeViewBox(archOrIr);
  return (
    normalizeViewBox(archOrIr.viewBox) ||
    normalizeViewBox(archOrIr?.meta?.viewBox)
  );
}

function snapshotArchitectureAsPrevious() {
  if (!state.architecture?.url) return;
  state.architecturePrevious = {
    ir: null,
    viewBox: state.architecture.viewBox || null,
    fingerprint: architectureFpOf(state.architecture),
    url: state.architecture.url,
    summary: state.architecture.summary || "",
  };
}

function showArchitecturePreviousBlock() {
  const prev = state.architecturePrevious;
  const cur = state.architecture;
  if (!prev?.url) return false;
  // Hide when current is the same confirmed diagram (no redesign in flight).
  if (
    cur?.confirmed &&
    cur.url &&
    architectureFpOf(cur) === architectureFpOf(prev) &&
    cur.url === prev.url
  ) {
    return false;
  }
  return true;
}

/** Inline mount gutters (Shadow DOM canvas padding — matches prior embed). */
const ARCH_EMBED_GUTTER_TOP = 100;
const ARCH_EMBED_GUTTER_LEFT = 100;

/**
 * UX order after 改进方案确认:
 *   改进卡 → CTA「请先确认架构，再派这一版」→ architecture panel
 * Otherwise keep the panel under 计划托管 (first-dispatch flow).
 */
function architectureBelongsAfterReviseCta() {
  return Boolean(
    state.revisePlanConfirmed &&
      !state.architecture?.confirmed &&
      el.revisePanel &&
      !el.revisePanel.hidden &&
      el.architectureSlotRevise &&
      (state.mode === "revise" ||
        state.mode === "architecture" ||
        state.reviseDialogueOpen),
  );
}

function placeArchitecturePanelForFlow() {
  const panel = el.architecturePanel;
  if (!panel) return;
  const wantRevise = architectureBelongsAfterReviseCta();
  const slot = wantRevise ? el.architectureSlotRevise : el.architectureSlotDeploy;
  if (!slot) return;
  if (panel.parentElement !== slot) {
    slot.appendChild(panel);
  }
  if (wantRevise && el.doReviseDispatch) {
    // Keep CTA visible above the diagram (disabled cue).
    el.doReviseDispatch.hidden = false;
  }
}

function syncArchitecturePanel(kind) {
  if (!el.architecturePanel) return;
  placeArchitecturePanelForFlow();
  el.architecturePanel.hidden = false;
  const a = state.architecture;
  const showPrev = showArchitecturePreviousBlock();
  if (el.architecturePreviousBlock) {
    el.architecturePreviousBlock.hidden = !showPrev;
  }
  if (showPrev && state.architecturePrevious) {
    const prev = state.architecturePrevious;
    if (el.architecturePreviousSummary) {
      el.architecturePreviousSummary.hidden = !prev.summary;
      el.architecturePreviousSummary.textContent = prev.summary || "";
    }
    void bindArchitectureMount(el.architecturePreviousFrame, prev);
  } else {
    clearArchitectureMount(el.architecturePreviousFrame);
  }
  if (el.architectureCurrentTitle) {
    el.architectureCurrentTitle.textContent = showPrev
      ? t("arch.titleNew")
      : t("arch.title");
  }
  if (el.architectureSummary) {
    el.architectureSummary.hidden = !(a.url && a.summary);
    el.architectureSummary.textContent = a.url ? a.summary || "" : "";
  }
  void bindArchitectureMount(el.architectureFrame, a.url ? a : null);
  if (el.architectureOpenFullscreen) {
    el.architectureOpenFullscreen.hidden = !a.url;
    el.architectureOpenFullscreen.disabled = !a.url || state.busy;
    el.architectureOpenFullscreen.textContent = t("arch.openFullscreen");
    el.architectureOpenFullscreen.title = t("arch.openFullscreenHint");
  }
  if (el.architectureConfirm) {
    const canConfirm = a.status === "preview" && a.url && !a.confirmed;
    const bugSkip = state.deskKind === "bug" && a.confirmed && !a.url;
    el.architectureConfirm.hidden =
      (!canConfirm && a.status !== "confirmed") || bugSkip;
    if (a.confirmed && !bugSkip) {
      el.architectureConfirm.hidden = false;
      el.architectureConfirm.disabled = true;
      el.architectureConfirm.textContent = t("arch.confirmed");
    } else if (!bugSkip) {
      el.architectureConfirm.disabled = !canConfirm || state.busy;
      el.architectureConfirm.textContent = t("arch.confirm");
    }
  }
  if (el.architectureRedesign) {
    const canRedesign =
      (Boolean(a.url) ||
        (state.deskKind === "bug" && a.confirmed)) &&
      (a.confirmed || state.revisePlanConfirmed) &&
      (state.deskKind === "bug" ||
        state.mode === "revise" ||
        state.mode === "architecture" ||
        state.reviseLocked ||
        state.lastDeliveryAccepted ||
        state.lastStatus === "accepted" ||
        state.lastStatus === "revising");
    el.architectureRedesign.hidden = !canRedesign;
    el.architectureRedesign.disabled = state.busy;
    if (state.deskKind === "bug" && a.confirmed && !a.url) {
      el.architectureRedesign.textContent = t("arch.bugOptionalDesign");
    } else {
      el.architectureRedesign.textContent = t("arch.redesign");
    }
  }
  if (el.architectureRetry) {
    const showRetry =
      !a.url &&
      !a.confirmed &&
      (state.mode === "architecture" ||
        state.locked ||
        kind === "missing" ||
        a.status === "designing");
    el.architectureRetry.hidden = !showRetry;
    el.architectureRetry.disabled = state.busy;
  }
  if (el.architectureHint) {
    if (kind === "bug-skip" || (state.deskKind === "bug" && a.confirmed && !a.url)) {
      el.architectureHint.textContent = t("arch.bugSkipHint");
    } else if (kind === "missing") {
      el.architectureHint.textContent = t("arch.hintMissing");
    } else if (kind === "stale") {
      el.architectureHint.textContent = t("arch.hintStale");
    } else if (state.revisePlanConfirmed && !a.confirmed) {
      el.architectureHint.textContent = t("arch.hintAfterRevisePlan");
    } else if (
      a.confirmed &&
      (state.mode === "revise" || state.lastDeliveryAccepted)
    ) {
      el.architectureHint.textContent = t("arch.hintReviseKeep");
    } else if (a.status === "idle" && state.locked && !a.confirmed) {
      el.architectureHint.textContent = t("arch.hintNeed");
    } else if (a.confirmed) {
      el.architectureHint.textContent = t("arch.hintConfirmed");
    } else if (a.status === "preview") {
      el.architectureHint.textContent = t("arch.hintPreview");
    } else if (a.status === "designing") {
      el.architectureHint.textContent = a.url
        ? t("arch.hintPreview")
        : t("arch.hintDesigning");
    } else {
      el.architectureHint.textContent = t("arch.hintNeed");
    }
  }
  syncDispatchButton();
  if (
    kind === "missing" ||
    a.status === "designing" ||
    a.status === "preview" ||
    Boolean(a.url)
  ) {
    requestAnimationFrame(() => {
      try {
        el.architecturePanel?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
        focusRightPanel({ force: true });
      } catch {
        /* ignore */
      }
    });
  }
}

function applyArchitectureFromChatPayload(data) {
  const url = String(data?.architectureUrl || "").trim();
  if (!url) return false;
  state.architecture.ir = null;
  state.architecture.viewBox = normalizeViewBox(data.architectureViewBox);
  state.architecture.fingerprint = String(data.architectureFingerprint || "");
  state.architecture.url = url;
  state.architecture.summary = String(data.architectureSummary || "");
  state.architecture.status = "preview";
  state.architecture.confirmed = false;
  if (!state.architecture.fingerprint) {
    state.architecture.fingerprint = architectureFpOf(state.architecture) || "";
  }
  invalidateDispatchAfterArchChange();
  syncArchitecturePanel();
  schedulePersistProjectDesk();
  return true;
}

function architectureClaimedReady(reply, data) {
  if (data?.ready && data?.diagram_type === "architecture") return true;
  const s = String(reply || "");
  return /架构图已生成|architecture diagram is ready|diagram is ready under/i.test(
    s,
  );
}

async function finishArchitectureChatResult(data, streamBubble, bag) {
  let rendered = applyArchitectureFromChatPayload(data);
  if (!rendered) {
    rendered = await maybeRenderArchitectureFromReply(
      `${data?.reply || ""}\n${typeof data?.jsonBlock === "string" ? data.jsonBlock : ""}`,
    );
  }
  if (rendered) {
    announceArchitectureRendered(streamBubble, bag);
    void persistProjectChat();
    return true;
  }
  if (architectureClaimedReady(data?.reply, data)) {
    syncArchitecturePanel("missing");
    // Rewrite the same bubble — do not leave「架构图已生成」visible above a missing panel.
    announceArchitectureMissing(streamBubble, bag);
    void persistProjectChat();
  } else {
    syncArchitecturePanel();
  }
  return false;
}

function retryArchitectureDesign() {
  if (state.busy) return;
  state.architectureMessages = [];
  beginArchitectureDesign({ kickoff: true });
}

function isArchitectureSystemKick(m) {
  const c = String(m?.content || "");
  return (
    m?.role === "user" &&
    (c.startsWith("（系统）") ||
      c.startsWith("(system)") ||
      c.includes("请根据需求卡设计系统架构") ||
      c.includes("Design the system architecture"))
  );
}

function appendArchitectureMessagesToLog() {
  for (const m of state.architectureMessages || []) {
    if (isArchitectureSystemKick(m)) continue;
    const role = m.role === "user" ? "user" : "bot";
    addBubble(role, m.content || "");
  }
}

function isReviseSystemKick(m) {
  const c = String(m?.content || "");
  return (
    m?.role === "user" &&
    (c.startsWith("（系统）") || c.startsWith("(system)"))
  );
}

function appendReviseMessagesToLog() {
  for (const m of state.reviseMessages || []) {
    if (isReviseSystemKick(m)) continue;
    const role = m.role === "user" ? "user" : "bot";
    addBubble(role, m.content || "");
  }
}

/**
 * Swap the left chat log to the active dialogue bag for the desk mode.
 * Revise must show user-sent revise turns (not the frozen specify thread).
 */
function switchChatLogForMode(mode = state.mode) {
  clearChatLog();
  if (mode === "revise") {
    appendReviseMessagesToLog();
  } else if (mode === "architecture") {
    appendArchitectureMessagesToLog();
  } else {
    renderMessagesToLog(state.messages);
  }
  syncChatEmpty();
}

function restoreReviseDeskUi() {
  const hasRevise =
    state.mode === "revise" ||
    state.reviseLocked ||
    (Array.isArray(state.reviseMessages) && state.reviseMessages.length > 0) ||
    Boolean(
      (el.revGoal?.value || "").trim() || (el.revAccept?.value || "").trim(),
    );
  if (!hasRevise) return;
  if (state.mode === "revise") {
    switchChatLogForMode("revise");
  } else if (
    Array.isArray(state.reviseMessages) &&
    state.reviseMessages.length > 0 &&
    state.mode !== "architecture"
  ) {
    // After lock / accepted revise: keep revise thread visible so user turns remain.
    switchChatLogForMode("revise");
  }
  renderRevisePanel({
    canRevise: true,
    status: state.reviseLocked ? "revising" : "accepted",
    delivery: { status: "accepted" },
    revision: state.lastRevision?.revision || 0,
  });
  applyCardChrome();
  syncReviseCardChrome();
  syncChatPlaceholder();
}

function maybeNudgeArchitectureContinue() {
  if (state.mode !== "architecture") return;
  if (state.architecture.confirmed) return;
  if (state.architecture.status === "preview" && state.architecture.url) return;
  const hasAssistant = (state.architectureMessages || []).some(
    (m) => m.role === "assistant",
  );
  if (!hasAssistant) return;
  // Avoid stacking nudges
  const lastVisible = [...(el.log?.querySelectorAll(".bubble.bot") || [])]
    .map((n) => n.textContent || "")
    .filter(Boolean)
    .pop();
  if (lastVisible && lastVisible.includes(t("arch.nudgeContinue"))) return;
  addBubble("bot", t("arch.nudgeContinue"), {
    options: architectureContinueOptions({}),
  });
}

function beginArchitectureDesign({ kickoff = false } = {}) {
  invalidateDispatchAfterArchChange();
  if (state.architecture.confirmed && state.architecture.url) {
    snapshotArchitectureAsPrevious();
  }
  state.architecture = {
    status: "designing",
    ir: null,
    url: null,
    summary: "",
    confirmed: false,
  };
  state.mode = "architecture";
  switchChatLogForMode("architecture");
  syncArchitecturePanel();
  syncChatPlaceholder();
  syncComposerEnabled();
  schedulePersistProjectDesk();
  if (kickoff) {
    void kickoffArchitectureDialogue();
  }
}

async function kickoffArchitectureDialogue() {
  if (!state.projectPath) {
    explainChatBlocked();
    return;
  }
  if (state.mode !== "architecture") return;
  if (state.architectureMessages.some((m) => m.role === "assistant")) return;
  if (state.busy) {
    setTimeout(() => {
      void kickoffArchitectureDialogue();
    }, 50);
    return;
  }
  // Drop orphan system kicks from an aborted prior attempt
  state.architectureMessages = state.architectureMessages.filter(
    (m) => !isArchitectureSystemKick(m),
  );
  const target = t(`dispatch.deploy.${state.deployTarget || "none"}`);
  addBubble(
    "bot",
    state.revisePlanConfirmed ? t("arch.enterDesignRevise") : t("arch.enterDesign"),
  );
  scrollChatToLatest();
  el.input?.focus();
  setBusy(true);
  const streamBubble = startStreamingBubble();
  const kick = state.revisePlanConfirmed
    ? t("arch.kickoffInternalRevise", { target })
    : t("arch.kickoffInternal", { target });
  state.architectureMessages.push({ role: "user", content: kick });
  void persistProjectChat();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: state.architectureMessages.slice(-16),
        card: state.revisePlanConfirmed ? reviseCardValues() : cardValues(),
        mode: "architecture",
        deployTarget: state.deployTarget || "none",
        stream: true,
      }),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok && !ctype.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || t("err.chat"));
    }
    if (ctype.includes("text/event-stream") && res.body) {
      let final = null;
      let streamError = null;
      await readChatStream(res, (evt) => {
        if (evt.type === "delta" && evt.text) streamBubble.append(evt.text);
        else if (evt.type === "done") final = evt;
        else if (evt.type === "error") {
          streamError = new Error(evt.error || t("err.chat"));
        }
      });
      if (streamError) throw streamError;
      if (!final) throw new Error(t("err.streamIncomplete"));
      if (final.reply) streamBubble.set(final.reply);
      streamBubble.finish(architectureContinueOptions(final));
      state.architectureMessages.push({
        role: "assistant",
        content: final.reply,
      });
      void persistProjectChat();
      await finishArchitectureChatResult(
        final,
        streamBubble,
        state.architectureMessages,
      );
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("err.chat"));
      streamBubble.set(data.reply || "");
      streamBubble.finish(architectureContinueOptions(data));
      state.architectureMessages.push({
        role: "assistant",
        content: data.reply,
      });
      void persistProjectChat();
      await finishArchitectureChatResult(
        data,
        streamBubble,
        state.architectureMessages,
      );
    }
  } catch (err) {
    state.architectureMessages.pop();
    streamBubble.set(
      t("bot.chatError", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
    streamBubble.finish();
  } finally {
    setBusy(false);
    syncConfirmEnabled();
    syncComposerEnabled();
    el.input?.focus();
  }
}

async function renderArchitectureFromIr(ir) {
  if (!ir) return false;
  const fp = architectureFingerprint(ir);
  const prevFp = architectureFpOf(state.architecturePrevious);
  const curFp = architectureFpOf(state.architecture);
  // Same structure as prior / current confirmed → keep confirmed, no re-gate.
  if (
    fp &&
    ((state.architecturePrevious?.url && fp === prevFp) ||
      (state.architecture.confirmed && fp === curFp))
  ) {
    if (fp === prevFp && state.architecturePrevious) {
      state.architecture = {
        status: "confirmed",
        ir: null,
        viewBox: state.architecturePrevious.viewBox || null,
        fingerprint: architectureFpOf(state.architecturePrevious) || fp,
        url: state.architecturePrevious.url,
        summary: state.architecturePrevious.summary || "",
        confirmed: true,
      };
      state.architecturePrevious = null;
    } else {
      state.architecture.status = "confirmed";
      state.architecture.confirmed = true;
      if (!state.architecture.fingerprint) state.architecture.fingerprint = fp;
    }
    syncArchitecturePanel();
    paintDeliveryCockpit();
    schedulePersistProjectDesk();
    return true;
  }
  if (state.architecture.confirmed && state.architecture.url && fp !== curFp) {
    snapshotArchitectureAsPrevious();
  }
  try {
    const res = await fetch("/api/architecture/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ir }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "render failed");
    // Drop deep IR immediately — keep only viewBox + fingerprint for UI.
    state.architecture.ir = null;
    state.architecture.viewBox =
      normalizeViewBox(data.viewBox) || architectureViewBoxOf(ir);
    state.architecture.fingerprint = fp;
    state.architecture.url = data.url;
    state.architecture.summary = data.summary || "";
    state.architecture.status = "preview";
    state.architecture.confirmed = false;
    syncArchitecturePanel();
    schedulePersistProjectDesk();
    return true;
  } catch (err) {
    addBubble(
      "bot",
      t("arch.renderFail", {
        msg: err instanceof Error ? err.message : String(err),
      }),
    );
    return false;
  }
}

async function maybeRenderArchitectureFromReply(reply) {
  if (state.mode !== "architecture") return false;
  const ir = extractArchitectureIr(reply);
  if (!ir) return false;
  return renderArchitectureFromIr(ir);
}

function rewriteArchitectureStreamBubble(streamBubble, msg, { actions } = {}) {
  if (streamBubble) {
    streamBubble.set(msg);
    try {
      streamBubble.body.innerHTML = renderChatMarkdown(msg);
    } catch {
      streamBubble.body.textContent = msg;
    }
    const host = streamBubble.div;
    host?.querySelectorAll(":scope > .options").forEach((n) => n.remove());
    host?.classList.remove("streaming");
    if (actions?.length && host) {
      const row = document.createElement("div");
      row.className = "options";
      for (const act of actions) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip action-chip";
        b.textContent = act.label;
        b.addEventListener("click", () => {
          if (typeof act.onClick === "function") void act.onClick(b);
        });
        row.appendChild(b);
      }
      host.appendChild(row);
    }
  } else {
    addBubble("bot", msg, { actions });
  }
}

/** After a successful diagram render, replace JSON-talk with a desk hint. */
function announceArchitectureRendered(streamBubble, bag) {
  const msg = t("arch.renderedReady");
  rewriteArchitectureStreamBubble(streamBubble, msg);
  if (Array.isArray(bag) && bag.length) {
    const last = bag[bag.length - 1];
    if (last?.role === "assistant") last.content = msg;
  }
  afterChatBubbleUi({ forceRight: true });
}

/** Claim-ready without IR: replace misleading「已生成」on the same bubble. */
function announceArchitectureMissing(streamBubble, bag) {
  const msg = t("arch.renderMissing");
  rewriteArchitectureStreamBubble(streamBubble, msg, {
    actions: [
      {
        label: t("arch.retry"),
        onClick: () => {
          retryArchitectureDesign();
        },
      },
    ],
  });
  if (Array.isArray(bag) && bag.length) {
    const last = bag[bag.length - 1];
    if (last?.role === "assistant") last.content = msg;
  }
  afterChatBubbleUi({ forceRight: true });
}

function confirmArchitecture() {
  if (!state.architecture.url) return;
  state.architecture.confirmed = true;
  state.architecture.status = "confirmed";
  state.architecture.ir = null;
  // Snapshot 初版 architecture on first confirm (before any revise plan).
  if (!state.revisePlanConfirmed && !state.initialArchitecture?.url) {
    state.initialArchitecture = architectureSnapshotFromState({
      changed: true,
    });
  }
  const revisePending = Boolean(
    state.revisePlanConfirmed ||
      (el.revGoal?.value || "").trim() ||
      (el.revAccept?.value || "").trim(),
  );
  state.mode = revisePending && !state.reviseLocked ? "revise" : "specify";
  if (state.mode === "revise") {
    switchChatLogForMode("revise");
  } else {
    switchChatLogForMode("specify");
  }
  syncArchitecturePanel();
  syncChatPlaceholder();
  syncReviseCardChrome();
  schedulePersistProjectDesk();
  addBubble("bot", t("arch.hintConfirmed"));
  // Decompose → recommend workers → confirm graph, then launch (incl. revise).
  // Always start a new 派工图 wave after architecture confirm.
  void showDispatchPanel({ forceNewWave: true });
}

async function autoFixAccept(btn, issues, kind = "confirm") {
  if (state.busy) return;
  if (kind === "confirm" && state.locked) return;
  if (kind === "revise" && state.reviseLocked) return;
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  setBusy(true);
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("bot.fixing");
  }
  if (kind === "confirm") {
    el.confirm.disabled = true;
    el.confirm.textContent = t("card.fixing");
  }
  try {
    if (kind === "revise") {
      const res = await fetch("/api/validate/fix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...v,
          issues,
          deskKind: state.deskKind === "bug" ? "bug" : "feature",
          projectPath: state.projectPath || undefined,
          previewUrl: state.lastPreviewUrl || undefined,
        }),
      });
      const data = await res.json();
      if (data.card) applyCard(data.card, { skipValidate: true });
      const next = reviseCardValues();
      const passed = Boolean(data.passed) && res.ok;
      state.validate = {
        kind: "revise",
        fingerprint: cardFingerprint(next),
        status: passed ? "passed" : "failed",
        summary: data.summary || data.error || "",
        issues: Array.isArray(data.issues) ? data.issues : [],
      };
      renderValidateHint();
      if (!passed) {
        const note = data.fixSummary ? `（${data.fixSummary}）` : "";
        addBubble("bot", t("bot.fixStillFailed", { note }));
        showAcceptFailed(data, { kind: "revise" });
      } else {
        addBubble(
          "bot",
          t("bot.validateFixed", { summary: data.fixSummary || data.summary || "" }),
        );
      }
      syncConfirmEnabled();
      return;
    }
    const res = await fetch("/api/confirm/fix", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...v,
        issues,
        moduleId: state.activeModuleId || "main",
        activeModuleId: state.activeModuleId || "main",
        modules: state.modules,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        rawAsk: state.rawAsk || v.goal,
        projectPath: state.projectPath || undefined,
        previewUrl: state.lastPreviewUrl || undefined,
      }),
    });
    const data = await res.json();
    if (data.card) applyCard(data.card, { skipValidate: true });
    if (res.status === 422 || data.passed === false) {
      const note = data.fixSummary ? `（${data.fixSummary}）` : "";
      addBubble("bot", t("bot.fixStillFailed", { note }));
      state.validate = {
        kind: "confirm",
        fingerprint: cardFingerprint(cardValues()),
        status: "failed",
        summary: data.summary || data.error || "",
        issues: Array.isArray(data.issues) ? data.issues : [],
      };
      renderValidateHint();
      showAcceptFailed(data, { kind: "confirm" });
      el.confirm.disabled = false;
      el.confirm.textContent = t("card.confirm");
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || t("err.autoFix"));
    resetValidateGate();
    await applyConfirmSuccess(data);
  } catch (err) {
    addBubble(
      "bot",
      t("bot.autoFixFail", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
    if (kind === "confirm") {
      el.confirm.disabled = false;
      el.confirm.textContent = t("card.confirm");
    }
    syncConfirmEnabled();
    if (btn) {
      btn.disabled = false;
      btn.textContent = t("bot.autoFix");
    }
  } finally {
    setBusy(false);
    syncConfirmEnabled();
  }
}

function isDispatchedStatus(data) {
  if (!data || typeof data !== "object") return false;
  const st = String(data.status || "");
  return Boolean(
    data.dispatch?.dispatchedAt ||
      data.dispatch?.worktreePath ||
      st === "dispatched" ||
      st === "revising" ||
      st === "accepted" ||
      data.delivery?.status === "accepted",
  );
}

function markDispatchDone({ persist = true } = {}) {
  state.dispatchPhase = "done";
  syncDispatchButton();
  if (persist) void persistProjectChat();
}

/** Keep「已派工」when the job is already on the server (refresh / timeout). */
function applyDispatchStateFromStatus(data) {
  if (!isDispatchedStatus(data)) return false;
  markDispatchDone({ persist: true });
  return true;
}

async function tryRecoverDispatchDone() {
  if (!state.jobId) return false;
  try {
    const res = await fetch(
      `/api/status?jobId=${encodeURIComponent(state.jobId)}`,
    );
    const data = await res.json();
    if (!res.ok) return false;
    return applyDispatchStateFromStatus(data);
  } catch {
    return false;
  }
}

async function showDispatchPanel(opts = {}) {
  const forceNewWave = Boolean(opts.forceNewWave);
  el.dispatch.hidden = false;
  el.dispatchErr.hidden = true;
  el.dispatchStatus.hidden = true;
  state.dispatchPhase = null;
  el.doDispatch.disabled = false;
  if (state.projectPath && el.repoPath) {
    el.repoPath.value = state.projectPath;
  }
  // Each architecture-confirm wave needs a fresh pool + new 派工图.
  if (forceNewWave || !state.taskPool?.tasks?.length) {
    resetDispatchGraphForNewWave({ silent: true, hidePanel: false });
    decomposeTasksFromModules();
  } else {
    applyRecommendedWorkerCount(state.taskPool.tasks);
    renderWorkerCountList();
    renderTaskPoolList(state.taskPool.tasks);
    syncOpenTaskGraphButton();
  }
  syncDispatchProjectLine();
  if (el.startCommand && !el.startCommand.value.trim()) {
    el.startCommand.value = defaultStartCommand();
  } else {
    ensureStartCommandPrefix();
  }
  renderDeployTargetList();
  syncArchitecturePanel();
  syncDispatchButton();
  state.repoCatalog = { recent: [], discovered: [] };
  focusRightPanel({ force: true });
  await Promise.all([loadRepoCatalog(false), loadAgents()]);
}

async function loadAgents() {
  try {
    const res = await fetch("/api/agents");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "agents failed");
    state.agents = data.agents || [];
    state.missingAgents = data.missing || [];
    const preferred = data.preferredAgentId;
    if (preferred && state.agents.some((a) => a.id === preferred)) {
      state.agentId = preferred;
    } else if (state.agents.length) {
      state.agentId = state.agents[0].id;
    } else if (state.missingAgents.length) {
      state.agentId = state.missingAgents[0].id;
    } else {
      state.agentId = "cursor-agent";
    }
    renderAgentList();
    renderDeployTargetList();
    syncDispatchButton();
  } catch (err) {
    state.agents = [];
    state.missingAgents = [];
    state.agentId = "cursor-agent";
    renderAgentList();
    renderDeployTargetList();
    if (el.agentHint) {
      el.agentHint.textContent =
        err instanceof Error ? err.message : t("err.agentsDetect");
    }
  }
}

function defaultStartCommand() {
  const goal = el.goal?.value?.trim() || t("startCmd.goalFallback");
  return `Duaer

${goal}

${t("startCmd.body")}
`;
}

function ensureStartCommandPrefix() {
  if (!el.startCommand) return;
  const raw = el.startCommand.value;
  if (!raw.trim()) {
    el.startCommand.value = defaultStartCommand();
    return;
  }
  let body = raw.trim().replace(/^Agent\b/m, "Duaer");
  if (!/^Duaer\b/m.test(body)) {
    el.startCommand.value = `Duaer\n\n${body}\n`;
  } else if (body !== raw.trim()) {
    el.startCommand.value = `${body}\n`;
  }
}

function syncInstallHint() {
  if (!el.agentInstall) return;
  const missing = state.missingAgents || [];
  const selectedMissing = missing.find(
    (m) => m.id === state.agentId && m.installCommand,
  );
  // Prefer the selected missing CLI; otherwise first missing with a command.
  const show = selectedMissing || missing.find((m) => m.installCommand) || null;
  if (show) {
    el.agentInstall.hidden = false;
    if (el.agentInstallTitle) {
      el.agentInstallTitle.textContent = t("dispatch.needCliNamed", {
        label: show.label || show.id,
      });
    }
    if (el.agentInstallCmd) {
      el.agentInstallCmd.textContent = show.installCommand;
    }
  } else {
    el.agentInstall.hidden = true;
  }
}

function syncStartCommandField() {
  if (!el.startCmdField || !el.startCommand) return;
  el.startCmdField.hidden = false;
  ensureStartCommandPrefix();
}

const DEPLOY_TARGET_IDS = [
  "none",
  "cloudflare",
  "aliyun",
  "aws",
  "github-pages",
];

function visibleDeployTargetIds() {
  return DEPLOY_TARGET_IDS.filter((id) => {
    if (id === "aliyun") return Boolean(state.lastCfg?.hasAliyunCredentials);
    if (id === "cloudflare")
      return Boolean(state.lastCfg?.hasCloudflareCredentials);
    if (id === "aws") return Boolean(state.lastCfg?.hasAwsCredentials);
    return true;
  });
}

function renderDeployTargetList() {
  if (!el.deployTargetList) return;
  el.deployTargetList.replaceChildren();
  const ids = visibleDeployTargetIds();
  if (!ids.includes(state.deployTarget)) {
    state.deployTarget = "none";
  }
  for (const id of ids) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "deploy-target-chip";
    b.setAttribute(
      "aria-pressed",
      id === state.deployTarget ? "true" : "false",
    );
    b.textContent = t(`dispatch.deploy.${id}`);
    b.addEventListener("click", () => {
      state.deployTarget = id;
      renderDeployTargetList();
    });
    el.deployTargetList.appendChild(b);
  }
}

function renderAgentList() {
  if (!el.agentList) return;
  el.agentList.replaceChildren();
  for (const a of state.agents) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "agent-chip";
    b.setAttribute("aria-pressed", a.id === state.agentId ? "true" : "false");
    const strong = document.createElement("strong");
    strong.textContent = a.label;
    b.appendChild(strong);
    const span = document.createElement("span");
    span.textContent = a.path
      ? t("agent.installedPath", { path: a.path })
      : a.hint || t("agent.installed");
    b.appendChild(span);
    b.addEventListener("click", () => {
      state.agentId = a.id;
      renderAgentList();
      syncDispatchButton();
      syncInstallHint();
      syncStartCommandField();
    });
    el.agentList.appendChild(b);
  }
  // Missing CLIs: dashed chip + install command visible on the chip
  for (const m of state.missingAgents || []) {
    if (!m.installCommand) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "agent-chip is-missing";
    b.setAttribute("aria-pressed", m.id === state.agentId ? "true" : "false");
    const strong = document.createElement("strong");
    strong.textContent = t("agent.notInstalled", { label: m.label });
    b.appendChild(strong);
    const span = document.createElement("span");
    span.textContent = t("agent.clickInstall");
    b.appendChild(span);
    const code = document.createElement("code");
    code.className = "agent-chip-cmd";
    code.textContent = m.installCommand;
    b.appendChild(code);
    b.addEventListener("click", () => {
      state.agentId = m.id;
      renderAgentList();
      syncDispatchButton();
      syncInstallHint();
      syncStartCommandField();
    });
    el.agentList.appendChild(b);
  }
  if (el.agentHint) {
    const miss = (state.missingAgents || [])
      .map((m) => m.label)
      .filter(Boolean);
    const ok = (state.agents || []).map((a) => a.label).filter(Boolean);
    if (miss.length && ok.length) {
      el.agentHint.textContent = t("agent.partialHint", {
        ok: localeListJoin(ok),
        miss: localeListJoin(miss),
      });
    } else if (miss.length) {
      el.agentHint.textContent = t("agent.missingHint", {
        list: localeListJoin(miss),
      });
    } else {
      el.agentHint.textContent = t("agent.detected");
    }
  }
  syncInstallHint();
  syncStartCommandField();
}

function syncBaselineUi() {
  if (!el.baselinePanel) return;
  const signed = baselineIsValid(state.baseline, state.modules);
  const canSign =
    modulesAllConfirmedLocal() &&
    Boolean(state.architecture?.confirmed) &&
    !signed &&
    state.dispatchPhase !== "done";
  if (el.baselineStatus) {
    if (signed) {
      el.baselineStatus.textContent = t("baseline.signedLine", {
        signer: state.baseline.signer,
        at: String(state.baseline.signedAt || "").replace("T", " ").slice(0, 19),
      });
    } else if (!modulesAllConfirmedLocal() || !state.architecture?.confirmed) {
      el.baselineStatus.textContent = t("baseline.waitConfirm");
    } else {
      el.baselineStatus.textContent = t("baseline.needSign");
    }
  }
  if (el.baselineSignerRow) el.baselineSignerRow.hidden = signed;
  if (el.baselineChangeRow) el.baselineChangeRow.hidden = !signed;
  if (el.baselineSign) {
    el.baselineSign.hidden = signed;
    el.baselineSign.disabled = !canSign || state.busy;
  }
  if (el.baselineChange) {
    el.baselineChange.hidden = !signed || state.dispatchPhase === "done";
    el.baselineChange.disabled = state.busy;
  }
  if (el.baselineSigner && !signed && !el.baselineSigner.value.trim()) {
    /* keep empty for operator */
  }
}

function signBaseline() {
  const signer = String(el.baselineSigner?.value || "").trim();
  if (!signer) {
    addBubble("bot", t("baseline.needSigner"));
    return;
  }
  if (!modulesAllConfirmedLocal() || !state.architecture?.confirmed) {
    addBubble("bot", t("baseline.waitConfirm"));
    return;
  }
  const fp = baselineFingerprint(state.modules);
  if (!fp || fp === "[]") {
    addBubble("bot", t("baseline.waitConfirm"));
    return;
  }
  state.baseline = {
    ...clipBaseline(state.baseline),
    signedAt: new Date().toISOString(),
    signer,
    fingerprint: fp,
  };
  addBubble("bot", t("baseline.signedOk", { signer }));
  syncBaselineUi();
  syncDispatchButton();
  schedulePersistProjectDesk();
}

function openBaselineChange() {
  const reason = String(el.baselineChangeReason?.value || "").trim();
  if (!reason) {
    addBubble("bot", t("baseline.needChangeReason"));
    return;
  }
  const prev = clipBaseline(state.baseline);
  const changes = [
    ...(prev.changes || []),
    {
      at: new Date().toISOString(),
      signer: prev.signer || "",
      reason,
      fingerprint: prev.fingerprint || "",
    },
  ];
  state.baseline = {
    signedAt: null,
    signer: "",
    fingerprint: "",
    changes,
  };
  state.modules = (state.modules || []).map((m) => ({
    ...m,
    status: "ready",
  }));
  state.locked = false;
  state.architecture = {
    ...state.architecture,
    confirmed: false,
    status: state.architecture.url ? "preview" : "idle",
  };
  clearDispatchGraphState({ silent: true, hidePanel: false });
  if (el.baselineChangeReason) el.baselineChangeReason.value = "";
  if (el.baselineSigner) el.baselineSigner.value = "";
  applyActiveModuleToFields();
  setConfirmFieldsReadonly(false);
  renderModuleTabs();
  syncConfirmEnabled();
  syncArchitecturePanel("stale");
  syncBaselineUi();
  syncDispatchButton();
  addBubble("bot", t("baseline.changeOpened"));
  schedulePersistProjectDesk();
}

function syncDispatchButton() {
  if (!el.doDispatch) return;
  syncBaselineUi();
  if (state.dispatchPhase === "done") {
    el.doDispatch.textContent = t("dispatch.done");
    el.doDispatch.disabled = true;
    return;
  }
  if (state.dispatchPhase === "working") {
    el.doDispatch.textContent = t("dispatch.working");
    return;
  }
  const missingSelected = (state.missingAgents || []).some(
    (m) => m.id === state.agentId,
  );
  if (missingSelected || !state.agents.length) {
    el.doDispatch.textContent = t("dispatch.needInstall");
    el.doDispatch.disabled = true;
    return;
  }
  if (state.locked && !state.architecture.confirmed) {
    el.doDispatch.textContent = t("arch.needConfirm");
    el.doDispatch.disabled = true;
    return;
  }
  if (!baselineIsValid(state.baseline, state.modules)) {
    el.doDispatch.textContent = t("baseline.needSignBtn");
    el.doDispatch.disabled = true;
    return;
  }
  el.doDispatch.disabled = false;
  const a = state.agents.find((x) => x.id === state.agentId);
  el.doDispatch.textContent = a
    ? t("dispatch.doWithAgent", { label: a.label })
    : t("dispatch.do");
}

async function loadRepoCatalog(discover) {
  el.repoScan.disabled = true;
  el.repoScan.textContent = discover
    ? t("dispatch.scanning")
    : t("dispatch.scan");
  try {
    const q = discover ? "?discover=1" : "";
    const res = await fetch(`/api/repos${q}`);
    const data = await res.json();
    state.repoCatalog = {
      recent: data.recent || data.repos || [],
      discovered: data.discovered || [],
    };
    renderRepoList();
  } finally {
    el.repoScan.disabled = false;
    el.repoScan.textContent = t("dispatch.scan");
  }
}

function renderRepoList() {
  const filter = (el.repoFilter?.value || "").trim().toLowerCase();
  const selected = el.repoPath.value.trim();
  const rows = [
    ...(state.repoCatalog.recent || []).map((r) => ({ ...r, kind: "recent" })),
    ...(state.repoCatalog.discovered || []).map((r) => ({
      ...r,
      kind: "discover",
    })),
  ].filter((r) => {
    if (!filter) return true;
    return (
      String(r.name || "").toLowerCase().includes(filter) ||
      String(r.path || "").toLowerCase().includes(filter)
    );
  });

  el.repoList.replaceChildren();
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "repo-empty";
    p.textContent = filter ? t("repo.emptyFilter") : t("repo.empty");
    el.repoList.appendChild(p);
    return;
  }
  for (const repo of rows) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "repo-chip";
    btn.setAttribute(
      "aria-pressed",
      repo.path === selected ? "true" : "false",
    );
    const tag = repo.kind === "recent" ? t("repo.recent") : t("repo.discovered");
    btn.innerHTML = `<strong>${escapeHtml(repo.name || pathBasename(repo.path))} · ${tag}</strong><span>${escapeHtml(repo.path)}</span>`;
    btn.addEventListener("click", () => {
      selectRepo(repo);
    });
    el.repoList.appendChild(btn);
  }
}

function pathBasename(p) {
  const parts = String(p || "").split(/[/\\]/);
  return parts.filter(Boolean).pop() || p;
}

const REQ_FIELD_PAIRS = [
  { ta: "goal", view: "goalView", emptyKey: "card.placeholder" },
  { ta: "outOfScope", view: "outOfScopeView", emptyKey: "card.placeholder" },
  { ta: "acceptance", view: "acceptanceView", emptyKey: "card.placeholder" },
  { ta: "assumptions", view: "assumptionsView", emptyKey: "card.placeholder" },
  { ta: "deviceMatrix", view: "deviceMatrixView", emptyKey: "card.devicePh" },
  { ta: "criticalPaths", view: "criticalPathsView", emptyKey: "card.pathsPh" },
  { ta: "exceptionCases", view: "exceptionCasesView", emptyKey: "card.exceptionsPh" },
  { ta: "apiContract", view: "apiContractView", emptyKey: "card.apiContractPh" },
  { ta: "envChecklist", view: "envChecklistView", emptyKey: "card.envChecklistPh" },
  { ta: "dataPrecheck", view: "dataPrecheckView", emptyKey: "card.dataPrecheckPh" },
  { ta: "externalDeps", view: "externalDepsView", emptyKey: "card.externalDepsPh" },
  { ta: "perfBudget", view: "perfBudgetView", emptyKey: "card.perfBudgetPh" },
  { ta: "revGoal", view: "revGoalView", emptyKey: "revise.goalPh" },
  { ta: "revOut", view: "revOutView", emptyKey: "revise.outPh" },
  { ta: "revAccept", view: "revAcceptView", emptyKey: "revise.acceptPh" },
  { ta: "revAssume", view: "revAssumeView", emptyKey: "revise.assumePh" },
];

function autoGrowTextarea(ta) {
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = `${Math.max(ta.scrollHeight, 42)}px`;
}

function reqSectionFor(ta) {
  return ta?.closest?.(".req-section") || null;
}

function isReqReadonly(taId) {
  if (
    [
      "goal",
      "outOfScope",
      "acceptance",
      "assumptions",
      "deviceMatrix",
      "criticalPaths",
      "exceptionCases",
      "apiContract",
      "envChecklist",
    "dataPrecheck",
    "externalDeps",
    "perfBudget",
    ].includes(taId)
  ) {
    return Boolean(state.locked || el[taId]?.readOnly);
  }
  if (["revGoal", "revOut", "revAccept", "revAssume"].includes(taId)) {
    return Boolean(state.reviseLocked || el[taId]?.readOnly);
  }
  return Boolean(el[taId]?.readOnly);
}

function syncReqSection(pair) {
  const ta = el[pair.ta];
  const view = el[pair.view];
  if (!ta || !view) return;
  const section = reqSectionFor(ta);
  if (section?.classList.contains("is-editing")) return;
  const empty = t(pair.emptyKey) || ta.placeholder || "…";
  view.innerHTML = structuredHtml(ta.value, empty);
  if (section) {
    section.classList.toggle("is-readonly", isReqReadonly(pair.ta));
  }
}

function syncReqSections() {
  for (const pair of REQ_FIELD_PAIRS) syncReqSection(pair);
}

function readReqEditorItems(view) {
  return [...view.querySelectorAll(".req-item-input")].map((n) => n.value);
}

function commitReqEditorToTextarea(pair) {
  const ta = el[pair.ta];
  const view = el[pair.view];
  if (!ta || !view) return;
  // After exit, syncReqSection replaces the editor DOM. Never serialize an
  // empty input list back into the textarea or the field is wiped.
  const inputs = view.querySelectorAll(".req-item-input");
  if (!inputs.length) return;
  const mode = view.dataset.editMode || "ul";
  ta.value = serializeReqEdit(
    mode,
    [...inputs].map((n) => n.value),
  );
}

function paintReqEditor(pair, focusIndex = 0, override = null) {
  const ta = el[pair.ta];
  const view = el[pair.view];
  if (!ta || !view) return;
  const model = override || reqEditModel(ta.value);
  view.dataset.editMode = model.mode;
  const listClass =
    model.mode === "ol"
      ? "req-list req-list-num req-edit-list"
      : model.mode === "para"
        ? "req-list req-edit-list req-edit-para"
        : "req-list req-edit-list";
  const tag = model.mode === "ol" ? "ol" : "ul";
  const items = model.items.length ? model.items : [""];
  view.innerHTML = `
    <${tag} class="${listClass}">
      ${items
        .map(
          (item, i) => `
        <li class="req-item req-item-edit">
          <textarea class="req-item-input" rows="1" data-idx="${i}" aria-label="${escapeHtml(t(pair.emptyKey) || "")}">${escapeHtml(item)}</textarea>
          <button type="button" class="req-item-remove" data-idx="${i}" title="${escapeHtml(t("card.reqRemove"))}" aria-label="${escapeHtml(t("card.reqRemove"))}">×</button>
        </li>`,
        )
        .join("")}
    </${tag}>
    <button type="button" class="btn req-add-item">${escapeHtml(t("card.reqAdd"))}</button>
  `;
  for (const input of view.querySelectorAll(".req-item-input")) {
    autoGrowTextarea(input);
  }
  const focusEl =
    view.querySelector(`.req-item-input[data-idx="${focusIndex}"]`) ||
    view.querySelector(".req-item-input");
  if (focusEl) {
    focusEl.focus();
    const len = focusEl.value.length;
    try {
      focusEl.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }
}

function onReqEditorChanged(pair) {
  commitReqEditorToTextarea(pair);
  const kind = ["revGoal", "revOut", "revAccept", "revAssume"].includes(pair.ta)
    ? "revise"
    : "confirm";
  if (kind === "confirm" && !state.locked) scheduleValidate("confirm");
  if (kind === "revise" && !state.reviseLocked) scheduleValidate("revise");
  schedulePersistProjectDesk();
}

function enterReqEdit(pair) {
  const ta = el[pair.ta];
  const section = reqSectionFor(ta);
  if (!ta || !section || isReqReadonly(pair.ta)) return;
  if (section.classList.contains("is-editing")) return;
  const model = reqEditModel(ta.value);
  ta.value = serializeReqEdit(model.mode, model.items);
  section.classList.add("is-editing");
  paintReqEditor(pair, 0);
}

function exitReqEdit(pair) {
  const ta = el[pair.ta];
  const view = el[pair.view];
  const section = reqSectionFor(ta);
  if (!section?.classList.contains("is-editing")) return;
  commitReqEditorToTextarea(pair);
  section.classList.remove("is-editing");
  if (view) {
    delete view.dataset.editMode;
  }
  syncReqSection(pair);
  onReqEditorChanged(pair);
}

function wireReqSections() {
  for (const pair of REQ_FIELD_PAIRS) {
    const ta = el[pair.ta];
    const view = el[pair.view];
    if (!ta || !view) continue;
    view.addEventListener("click", (ev) => {
      if (isReqReadonly(pair.ta)) return;
      const section = reqSectionFor(ta);
      if (section?.classList.contains("is-editing")) {
        // clicks inside editor are handled by item controls
        return;
      }
      enterReqEdit(pair);
    });
    view.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        const section = reqSectionFor(ta);
        if (section?.classList.contains("is-editing")) return;
        ev.preventDefault();
        enterReqEdit(pair);
      }
    });
    view.addEventListener("input", (ev) => {
      if (!ev.target?.classList?.contains("req-item-input")) return;
      autoGrowTextarea(ev.target);
      onReqEditorChanged(pair);
    });
    view.addEventListener("keydown", (ev) => {
      if (!ev.target?.classList?.contains("req-item-input")) return;
      const input = ev.target;
      const idx = Number(input.dataset.idx || 0);
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        commitReqEditorToTextarea(pair);
        const items = readReqEditorItems(view);
        items.splice(idx + 1, 0, "");
        let mode = view.dataset.editMode || "ul";
        if (mode === "para") mode = "ul";
        paintReqEditor(pair, idx + 1, { mode, items });
        onReqEditorChanged(pair);
        return;
      }
      if (ev.key === "Backspace" && input.value === "" && readReqEditorItems(view).length > 1) {
        ev.preventDefault();
        const items = readReqEditorItems(view);
        items.splice(idx, 1);
        const mode = view.dataset.editMode || "ul";
        paintReqEditor(pair, Math.max(0, idx - 1), {
          mode,
          items: items.length ? items : [""],
        });
        onReqEditorChanged(pair);
      }
    });
    view.addEventListener("click", (ev) => {
      const add = ev.target?.closest?.(".req-add-item");
      const remove = ev.target?.closest?.(".req-item-remove");
      if (add) {
        ev.preventDefault();
        const items = readReqEditorItems(view);
        items.push("");
        let mode = view.dataset.editMode || "ul";
        if (mode === "para") mode = "ul";
        paintReqEditor(pair, items.length - 1, { mode, items });
        onReqEditorChanged(pair);
        return;
      }
      if (remove) {
        ev.preventDefault();
        const idx = Number(remove.dataset.idx || 0);
        const items = readReqEditorItems(view);
        items.splice(idx, 1);
        const mode = view.dataset.editMode || "ul";
        paintReqEditor(pair, Math.max(0, idx - 1), {
          mode,
          items: items.length ? items : [""],
        });
        onReqEditorChanged(pair);
      }
    });
    const section = reqSectionFor(ta);
    section?.addEventListener("focusout", (ev) => {
      if (!section.classList.contains("is-editing")) return;
      const next = ev.relatedTarget;
      if (next && section.contains(next)) return;
      // Defer so click on add/remove can run first
      queueMicrotask(() => {
        if (!section.classList.contains("is-editing")) return;
        if (section.contains(document.activeElement)) return;
        exitReqEdit(pair);
      });
    });
  }
  syncReqSections();
}

function selectRepo(repo) {
  if (!repo?.path) return;
  el.repoPath.value = repo.path;
  const entry = {
    path: repo.path,
    name: repo.name || pathBasename(repo.path),
    baseBranch: repo.baseBranch,
    kind: "recent",
  };
  const rest = (state.repoCatalog.recent || []).filter(
    (r) => r.path !== entry.path,
  );
  state.repoCatalog = {
    recent: [entry, ...rest],
    discovered: (state.repoCatalog.discovered || []).filter(
      (r) => r.path !== entry.path,
    ),
  };
  renderRepoList();
}

el.repoBrowse?.addEventListener("click", async () => {
  el.dispatchErr.hidden = true;
  el.repoBrowse.disabled = true;
  el.repoBrowse.textContent = t("dispatch.browsing");
  try {
    const res = await fetch("/api/repos/pick", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      if (data.cancelled) return;
      if (Array.isArray(data.candidates) && data.candidates.length) {
        state.repoCatalog = {
          recent: state.repoCatalog.recent || [],
          discovered: data.candidates.map((c) => ({
            ...c,
            source: "discover",
          })),
        };
        renderRepoList();
        el.dispatchErr.hidden = false;
        el.dispatchErr.textContent = data.error || t("err.pickFromList");
        return;
      }
      if (data.path) {
        el.repoPath.value = data.path;
      }
      throw new Error(data.error || t("err.pick"));
    }
    if (Array.isArray(data.recent)) {
      state.repoCatalog.recent = data.recent;
    }
    selectRepo(data);
    const prep = [
      data.baseBranchCreated ? t("prep.baseBranch") : null,
      data.bootstrapped && !data.baseBranchCreated ? t("prep.gitInit") : null,
      data.duaer?.action === "init" ? t("prep.duaerInit") : null,
    ].filter(Boolean);
    addBubble(
      "bot",
      prep.length
        ? t("bot.repoPrepared", {
            name: data.name,
            prep: prep.join(" · "),
          })
        : t("bot.repoSelected", { name: data.name }),
    );
  } catch (err) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent =
      err instanceof Error ? err.message : String(err);
  } finally {
    el.repoBrowse.disabled = false;
    el.repoBrowse.textContent = t("dispatch.browse");
  }
});

el.architectureConfirm?.addEventListener("click", () => {
  confirmArchitecture();
});

el.bugHotfix?.addEventListener("change", () => {
  state.bugHotfix = Boolean(el.bugHotfix.checked);
  schedulePersistProjectDesk();
});

for (const btn of [el.startBugFix, el.startBugFixEarly, el.startBugFixAlt]) {
  btn?.addEventListener("click", (ev) => {
    ev.preventDefault();
    beginBugFixFromCta();
  });
}

el.architectureRedesign?.addEventListener("click", () => {
  if (state.busy) return;
  beginArchitectureDesign({ kickoff: true });
  addBubble("bot", t("arch.enterDesign"));
});

el.architectureRetry?.addEventListener("click", () => {
  retryArchitectureDesign();
});

el.architectureOpenFullscreen?.addEventListener("click", () => {
  const url =
    state.architecture?.url ||
    el.architectureFrame?.dataset?.archUrl ||
    "";
  openArchitecturePresent(url);
});

el.pickProjectsRoot?.addEventListener("click", async () => {
  if (el.historyErr) el.historyErr.hidden = true;
  if (el.dispatchErr) el.dispatchErr.hidden = true;
  if (el.pickProjectsRoot) {
    el.pickProjectsRoot.disabled = true;
    el.pickProjectsRoot.textContent = t("dispatch.pickProjectsRootBusy");
  }
  if (el.projectsRoot) el.projectsRoot.disabled = true;
  try {
    const res = await fetch("/api/projects/pick-root", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.cancelled) return;
      throw new Error(data.error || t("dispatch.projectsRootPickFail"));
    }
    if (el.projectsRoot) el.projectsRoot.value = data.projectsRoot || "";
    state.lastCfg = { ...(state.lastCfg || {}), ...data };
    if (Array.isArray(data.projects)) {
      state.projects = data.projects;
      renderProjectList();
    }
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = t("dispatch.projectsRootSaved");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = msg;
    }
  } finally {
    if (el.pickProjectsRoot) {
      el.pickProjectsRoot.disabled = false;
      el.pickProjectsRoot.textContent = t("dispatch.pickProjectsRoot");
    }
    if (el.projectsRoot) el.projectsRoot.disabled = false;
  }
});

el.projectsRoot?.addEventListener("click", () => {
  if (el.pickProjectsRoot?.disabled) return;
  el.pickProjectsRoot?.click();
});
el.projectsRoot?.addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" && ev.key !== " ") return;
  ev.preventDefault();
  if (el.pickProjectsRoot?.disabled) return;
  el.pickProjectsRoot?.click();
});

el.clearProjectsRoot?.addEventListener("click", async () => {
  if (el.historyErr) el.historyErr.hidden = true;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectsRoot: "" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("dispatch.projectsRootFail"));
    if (el.projectsRoot) el.projectsRoot.value = "";
    state.lastCfg = { ...(state.lastCfg || {}), ...data };
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = t("dispatch.projectsRootCleared");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = msg;
    }
  }
});

el.repoFilter?.addEventListener("input", () => renderRepoList());

el.baselineSign?.addEventListener("click", () => {
  signBaseline();
});
el.baselineChange?.addEventListener("click", () => {
  openBaselineChange();
});

el.doDispatch.addEventListener("click", async () => {
  if (state.busy) return;
  if (!state.jobId && !modulesAllConfirmedLocal()) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("dispatch.needModules");
    return;
  }
  const repoPath =
    (state.projectPath || "").trim() || el.repoPath.value.trim();
  if (!repoPath) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("err.noRepo");
    setHistoryOpen(true);
    return;
  }
  if (el.repoPath) el.repoPath.value = repoPath;
  const missingSelected = (state.missingAgents || []).some(
    (m) => m.id === state.agentId,
  );
  if (missingSelected) {
    el.dispatchErr.hidden = false;
    const m = (state.missingAgents || []).find((x) => x.id === state.agentId);
    el.dispatchErr.textContent = m?.installCommand
      ? t("err.installAgent", { cmd: m.installCommand })
      : t("err.needAgentAlt");
    syncInstallHint();
    return;
  }
  if (!state.architecture.confirmed) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("arch.needConfirm");
    syncArchitecturePanel("stale");
    return;
  }
  if (!baselineIsValid(state.baseline, state.modules)) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("baseline.needSign");
    syncBaselineUi();
    return;
  }
  if (!state.dispatchGraphReady || !state.taskPool?.tasks?.length) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("dispatch.needGraphConfirm");
    return;
  }
  ensureStartCommandPrefix();
  const startCommand = el.startCommand?.value?.trim() || "";
  const workerCount = Math.max(1, Math.min(4, Number(state.workerCount) || 1));
  state.workerCount = workerCount;
  el.dispatchErr.hidden = true;
  el.doDispatch.disabled = true;
  state.dispatchPhase = "working";
  el.doDispatch.textContent = t("dispatch.working");
  setBusy(true);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 60000);
  try {
    const res = await fetch("/api/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ac.signal,
      body: JSON.stringify({
        jobId: state.jobId || undefined,
        repoPath,
        agentId: state.agentId || "cursor-agent",
        startCommand,
        deployTarget: state.deployTarget || "none",
        architectureSummary: state.architecture.summary || "",
        architectureUrl: state.architecture.url || "",
        // Never send deep IR — server loads from architecture/<key>.json.
        architectureIr: null,
        modules: state.modules,
        workerCount,
        deskKind: state.deskKind === "bug" ? "bug" : "feature",
        bugHotfix: Boolean(state.bugHotfix),
        rawAsk: state.rawAsk || "",
        baseline: state.baseline,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("err.dispatch"));
    if (data.jobId) state.jobId = data.jobId;
    if (data.taskPool) state.taskPool = data.taskPool;
    const launch = data.launch || {};
    const launchLine = launch.agentId
      ? t("launch.line", {
          label: launch.label || launch.agentId,
          pid: launch.pid ? t("launch.pid", { pid: launch.pid }) : "",
          cli: launch.command ? t("launch.cli", { cmd: launch.command }) : "",
          script: launch.commandFile
            ? t("launch.script", { path: launch.commandFile })
            : "",
          log: launch.logPath ? t("launch.log", { path: launch.logPath }) : "",
        })
      : t("launch.none");
    el.result.hidden = false;
    el.result.textContent = t("result.dispatchOk", {
      repo: data.repoPath,
      worktree: data.worktreePath,
      brief: data.featureDir,
      launch: launchLine,
      cmd: data.agentPrompt || startCommand,
    });
    const whoLabel = launch.command || launch.label || "agent";
    const who =
      launch.busy && (launch.mode === "terminal-reuse" || launch.reused)
        ? t("launch.queuedWait", { who: whoLabel })
        : launch.mode === "terminal-reuse" || launch.reused
          ? t("launch.reused", { who: whoLabel })
          : launch.mode === "terminal"
            ? t("launch.terminal", { who: whoLabel })
            : t("launch.spawned", {
                who: launch.label || launch.agentId || "CLI",
              });
    const duaerLine =
      data.duaerInstall?.worktree?.action === "init" ||
      data.duaerInstall?.repo?.action === "init"
        ? t("launch.duaerInstalled")
        : t("launch.duaerReady");
    addBubble(
      "bot",
      t("bot.dispatchDone", {
        duaer: duaerLine,
        who,
        path: data.worktreePath,
      }),
    );
    state.dispatchPhase = "done";
    el.doDispatch.textContent = t("dispatch.done");
    el.dispatchStatus.hidden = false;
    el.dispatchStatus.textContent =
      launch.kind === "worker" ? t("status.running") : t("status.waiting");
    beginRunBlock({ revision: 0, note: t("run.note.dispatch") });
    markDispatchDone({ persist: true });
    startStatusPoll();
    focusRightPanel({ force: true });
  } catch (err) {
    const recovered = await tryRecoverDispatchDone();
    if (!recovered) {
      state.dispatchPhase = null;
      el.doDispatch.disabled = false;
      syncDispatchButton();
      el.dispatchErr.hidden = false;
      const msg =
        err?.name === "AbortError"
          ? t("err.dispatchTimeout")
          : err instanceof Error
            ? err.message
            : String(err);
      el.dispatchErr.textContent = msg;
      if (String(msg).includes("curl https://cursor.com/install")) {
        syncInstallHint();
        if (el.agentInstall) el.agentInstall.hidden = false;
        if (el.agentInstallCmd) {
          el.agentInstallCmd.textContent =
            "curl https://cursor.com/install -fsS | bash";
        }
      }
    }
  } finally {
    clearTimeout(timer);
    setBusy(false);
    if (state.dispatchPhase === "working") {
      state.dispatchPhase = null;
      el.doDispatch.disabled = false;
      syncDispatchButton();
    }
  }
});

el.copyInstallCmd?.addEventListener("click", async () => {
  const cmd = el.agentInstallCmd?.textContent?.trim();
  if (!cmd) return;
  try {
    await navigator.clipboard.writeText(cmd);
    el.copyInstallCmd.textContent = t("dispatch.copied");
    setTimeout(() => {
      el.copyInstallCmd.textContent = t("dispatch.copyInstall");
    }, 1500);
  } catch {
    el.copyInstallCmd.textContent = t("err.copy");
  }
});

el.agentRedetect?.addEventListener("click", async () => {
  if (!el.agentRedetect) return;
  el.agentRedetect.disabled = true;
  el.agentRedetect.textContent = t("dispatch.redetecting");
  try {
    await loadAgents();
  } finally {
    el.agentRedetect.disabled = false;
    el.agentRedetect.textContent = t("dispatch.redetect");
  }
});

el.startCommand?.addEventListener("blur", () => ensureStartCommandPrefix());

function clearRunTimeline() {
  state.activeRun = null;
  if (!el.runTimeline) return;
  el.runTimeline.replaceChildren();
  el.runTimeline.hidden = true;
  if (el.progressEmpty) el.progressEmpty.hidden = false;
}

function freezeActiveRun() {
  const prev = state.activeRun;
  if (!prev?.root) return;
  prev.root.dataset.active = "false";
  state.activeRun = null;
}

/**
 * Append a progress block under the timeline (below revise/dispatch UI).
 * Each revision/dispatch owns its own block; older blocks stay frozen above.
 */
function beginRunBlock({ revision = 0, note = "" } = {}) {
  if (!el.runTimeline) return null;
  const rev = Number(revision) || 0;
  if (state.activeRun && Number(state.activeRun.revision) === rev) {
    if (note && state.activeRun.noteEl) {
      state.activeRun.noteEl.hidden = false;
      state.activeRun.noteEl.textContent = note;
    }
    el.runTimeline.hidden = false;
    if (el.progressEmpty) el.progressEmpty.hidden = true;
    return state.activeRun;
  }
  freezeActiveRun();
  const root = document.createElement("article");
  root.className = "run-block";
  root.dataset.revision = String(rev);
  root.dataset.active = "true";

  const mark = document.createElement("p");
  mark.className = "mark";
  mark.textContent = t("run.mark");

  const title = document.createElement("h4");
  title.className = "run-block-title";
  title.textContent =
    rev > 0 ? t("run.revision", { revision: rev }) : t("run.dispatch");

  const noteEl = document.createElement("p");
  noteEl.className = "run-block-note";
  if (note) {
    noteEl.textContent = note;
  } else {
    noteEl.hidden = true;
  }

  const panel = document.createElement("div");
  panel.className = "progress-panel";
  const meter = document.createElement("div");
  meter.className = "progress-meter";
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", "100");
  meter.setAttribute("aria-valuenow", "0");
  meter.hidden = true;
  const meterFill = document.createElement("div");
  meterFill.className = "progress-meter-fill";
  meter.appendChild(meterFill);
  const summary = document.createElement("p");
  summary.className = "progress-summary";
  const activity = document.createElement("p");
  activity.className = "progress-activity";
  activity.hidden = true;
  const workers = document.createElement("div");
  workers.className = "worker-lanes";
  workers.hidden = true;
  const orchLine = document.createElement("p");
  orchLine.className = "orch-summary";
  orchLine.hidden = true;
  const tasks = document.createElement("ul");
  tasks.className = "progress-tasks";
  const log = document.createElement("pre");
  log.className = "progress-log";
  log.hidden = true;
  panel.appendChild(meter);
  panel.appendChild(summary);
  panel.appendChild(activity);
  panel.appendChild(orchLine);
  panel.appendChild(workers);
  panel.appendChild(tasks);
  panel.appendChild(log);

  root.appendChild(mark);
  root.appendChild(title);
  root.appendChild(noteEl);
  root.appendChild(panel);
  el.runTimeline.appendChild(root);
  el.runTimeline.hidden = false;
  if (el.progressEmpty) el.progressEmpty.hidden = true;

  state.activeRun = {
    revision: rev,
    root,
    title,
    meter,
    meterFill,
    summary,
    activity,
    orchLine,
    workers,
    tasks,
    log,
    noteEl,
  };
  return state.activeRun;
}

function workerStateLabel(stateKey) {
  const key = String(stateKey || "idle");
  const map = {
    running: "run.workerRunning",
    queued: "run.workerQueued",
    waiting: "run.workerWaiting",
    waiting_deps: "run.workerWaitingDeps",
    done: "run.workerDone",
    idle: "run.workerIdle",
  };
  return t(map[key] || map.idle);
}

function fillWorkerLanes(block, workers) {
  if (!block?.workers) return;
  const list = Array.isArray(workers) ? workers : [];
  if (list.length <= 1) {
    block.workers.hidden = true;
    block.workers.replaceChildren();
    if (block.tasks) block.tasks.hidden = false;
    if (block.log) {
      /* keep aggregate log visible for single worker */
    }
    return;
  }
  block.workers.hidden = false;
  if (block.tasks) {
    block.tasks.hidden = true;
    block.tasks.replaceChildren();
  }
  if (block.log) {
    block.log.hidden = true;
    block.log.textContent = "";
  }
  block.workers.replaceChildren();
  for (const w of list) {
    const card = document.createElement("article");
    card.className = "worker-lane";
    card.dataset.state = w.state || "idle";
    card.dataset.worker = w.id || "";

    const head = document.createElement("header");
    head.className = "worker-lane-head";
    const name = document.createElement("h5");
    name.className = "worker-lane-title";
    name.textContent = t("run.worker", { id: w.id || "?" });
    const badge = document.createElement("span");
    badge.className = "worker-lane-badge";
    badge.textContent = workerStateLabel(w.state);
    const meta = document.createElement("p");
    meta.className = "worker-lane-meta";
    const done = Number(w.done) || 0;
    const total = Number(w.total) || 0;
    meta.textContent =
      total > 0
        ? `${done}/${total}${w.current ? ` · ${w.current}` : ""}`
        : workerStateLabel(w.state);
    head.appendChild(name);
    head.appendChild(badge);
    card.appendChild(head);
    card.appendChild(meta);

    const laneMeter = document.createElement("div");
    laneMeter.className = "worker-lane-meter";
    const fill = document.createElement("div");
    fill.className = "worker-lane-meter-fill";
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    fill.style.width = `${pct}%`;
    laneMeter.appendChild(fill);
    if (total > 0) card.appendChild(laneMeter);

    const ul = document.createElement("ul");
    ul.className = "progress-tasks worker-lane-tasks";
    const nextId = (w.tasks || []).find((task) => !task.done)?.id;
    for (const task of w.tasks || []) {
      const li = document.createElement("li");
      li.dataset.done = task.done ? "true" : "false";
      if (!task.done && task.id === nextId) li.dataset.current = "true";
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = task.done ? "✓" : "·";
      const text = document.createElement("span");
      text.className = "progress-task-text";
      text.textContent = task.text;
      li.appendChild(mark);
      li.appendChild(text);
      ul.appendChild(li);
    }
    if (ul.childNodes.length) card.appendChild(ul);

    const lines = Array.isArray(w.logTail) ? w.logTail : [];
    if (lines.length) {
      const pre = document.createElement("pre");
      pre.className = "progress-log worker-lane-log";
      pre.textContent = lines.join("\n");
      card.appendChild(pre);
    }

    block.workers.appendChild(card);
  }
}

function fillRunProgress(block, data) {
  if (!block) return;
  const workers = Array.isArray(data?.workers) ? data.workers : [];
  const multi = workers.length > 1;
  if (block.title) {
    const rev = Number(block.revision) || 0;
    if (rev > 0) {
      block.title.textContent = t("run.revision", { revision: rev });
    } else if (multi) {
      block.title.textContent = t("run.dispatchWorkers", { n: workers.length });
    } else {
      block.title.textContent = t("run.dispatch");
    }
  }
  const progress = data?.progress;
  if (!progress) {
    if (block.summary) block.summary.textContent = "";
    if (block.meter) {
      block.meter.hidden = true;
      if (block.meterFill) block.meterFill.style.width = "0%";
    }
    if (block.activity) {
      block.activity.hidden = true;
      block.activity.textContent = "";
    }
    fillWorkerLanes(block, []);
    if (block.tasks) {
      block.tasks.hidden = false;
      block.tasks.replaceChildren();
    }
    if (block.log) {
      block.log.hidden = true;
      block.log.textContent = "";
    }
    return;
  }
  const done = Number(progress.done) || 0;
  const total = Number(progress.total) || 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  if (block.meter && block.meterFill) {
    block.meter.hidden = total <= 0;
    block.meterFill.style.width = `${pct}%`;
    block.meter.setAttribute("aria-valuenow", String(pct));
    block.meter.dataset.complete = done >= total && total > 0 ? "true" : "false";
  }
  if (block.summary) {
    block.summary.textContent = multi
      ? t("run.dispatchWorkersSummary", {
          n: workers.length,
          done,
          total,
          current: progress.current || "",
        })
      : `${done}/${total} · ${progress.current || ""}`;
  }
  const gate = data?.verifyGate;
  if (block.summary && gate && gate.result && gate.result !== "pass") {
    const line =
      gate.result === "fail"
        ? t("verify.fail", {
            command: gate.command || "",
            code: String(gate.exitCode ?? ""),
          })
        : t(gate.result === "invalid" ? "verify.invalid" : "verify.missing");
    block.summary.textContent = `${block.summary.textContent} · ${line}`;
  }
  if (block.activity) {
    const act = data?.activity;
    const line =
      (act && act.summary) ||
      (Array.isArray(act?.files) && act.files.length
        ? `改动中：${act.files
            .slice(0, 4)
            .map((f) => f.path || f)
            .join(" · ")}`
        : "");
    if (line) {
      block.activity.hidden = false;
      block.activity.textContent = line;
    } else {
      block.activity.hidden = true;
      block.activity.textContent = "";
    }
  }
  if (block.orchLine) {
    const orch = data?.orchestration || data?.dispatch?.orchestration;
    const sum = orch?.summary;
    if (sum && (Number(sum.releasedWaveCount) > 0 || Number(sum.blockedCount) > 0 || Number(sum.readyCount) > 0)) {
      block.orchLine.hidden = false;
      block.orchLine.textContent = t("run.orchSummary", {
        released: Number(sum.releasedWaveCount) || 0,
        ready: Number(sum.readyCount) || 0,
        blocked: Number(sum.blockedCount) || 0,
      });
    } else {
      block.orchLine.hidden = true;
      block.orchLine.textContent = "";
    }
  }
  fillWorkerLanes(block, workers);
  if (!multi && block.tasks) {
    block.tasks.hidden = false;
    block.tasks.replaceChildren();
    const nextId = progress.tasks?.find((task) => !task.done)?.id;
    for (const task of progress.tasks || []) {
      const li = document.createElement("li");
      li.dataset.done = task.done ? "true" : "false";
      if (!task.done && task.id === nextId) li.dataset.current = "true";
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = task.done ? "✓" : "·";
      const text = document.createElement("span");
      text.className = "progress-task-text";
      text.textContent = task.text;
      li.appendChild(mark);
      li.appendChild(text);
      block.tasks.appendChild(li);
    }
  }
  if (!multi && block.log) {
    const lines = data.logTail || [];
    if (lines.length) {
      block.log.hidden = false;
      block.log.textContent = lines.join("\n");
    } else {
      block.log.hidden = true;
      block.log.textContent = "";
    }
  }
}

function renderProgress(data) {
  if (!el.runTimeline) return;
  paintDeliveryCockpit(data);
  const progress = data?.progress;
  if (progress) state.lastJobProgress = progress;
  if (!progress) {
    if (!state.activeRun) el.runTimeline.hidden = el.runTimeline.childElementCount === 0;
    return;
  }
  const rev = Number(data.revision || 0);
  const prevRun = state.activeRun;
  const block = beginRunBlock({ revision: rev });
  const workerKey = (Array.isArray(data.workers) ? data.workers : [])
    .map((w) => `${w.id}:${w.done}/${w.total}:${w.state}`)
    .join("|");
  const focusKey = `${rev}:${Number(progress.done) || 0}/${Number(progress.total) || 0}:${data.status || ""}:${workerKey}`;
  const isNewBlock = Boolean(block && block !== prevRun);
  const changed = focusKey !== state.progressFocusKey;
  fillRunProgress(block, data);
  if (!isNewBlock && !changed) return;
  state.progressFocusKey = focusKey;
  // New run block: force into view. Progress ticks: soft focus (honors user scroll).
  focusRightPanel({ force: isNewBlock });
}

function resultFolderPath(data) {
  const d = data?.dispatch || {};
  const wt = String(d.worktreePath || "").trim();
  if (wt && d.worktreeExists !== false) return wt;
  const repo = String(d.repoPath || state.projectPath || "").trim();
  return repo || "";
}

async function openResultFolder(data) {
  const folder = resultFolderPath(data || { dispatch: state.lastDispatch });
  if (!folder || !state.jobId) {
    addBubble("bot", t("preview.openFail", { msg: t("err.noRepo") }));
    return;
  }
  try {
    const res = await fetch("/api/reveal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: state.jobId, which: "worktree" }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "reveal failed");
    paintServiceStatusLine(t("preview.opened"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addBubble("bot", t("preview.openFail", { msg }));
  }
}

function paintServiceStatusLine(text) {
  if (el.previewServiceStatus && text) {
    el.previewServiceStatus.textContent = text;
  }
}

function setPreviewOpenBusy(busy) {
  for (const btn of [el.previewLink, el.previewStartService]) {
    if (!btn) continue;
    btn.disabled = Boolean(busy);
  }
}

function resultHeadingText(revision) {
  const rev = Number(revision) || 0;
  return rev > 0
    ? t("preview.headingRev", { revision: rev })
    : t("preview.headingInitial");
}

function versionChipLabel(revision) {
  const rev = Number(revision) || 0;
  return rev > 0
    ? t("preview.versionRev", { revision: rev })
    : t("preview.versionInitial");
}

function setServiceDot(kind) {
  if (!el.previewServiceDot) return;
  el.previewServiceDot.classList.remove("is-up", "is-down", "is-busy", "is-unknown");
  el.previewServiceDot.classList.add(
    kind === "up"
      ? "is-up"
      : kind === "down"
        ? "is-down"
        : kind === "busy"
          ? "is-busy"
          : "is-unknown",
  );
}

function paintPreviewServiceUi(status) {
  if (!el.previewService) return;
  const url = String(status?.url || state.lastPreviewUrl || "").trim();
  const local = Boolean(status?.local);
  // Static / artifact pages: no status chip — keep the bar one line.
  if (!url || !local) {
    el.previewService.hidden = true;
    return;
  }
  el.previewService.hidden = false;
  if (status?.listening === true) {
    setServiceDot("up");
    if (el.previewServiceStatus) {
      el.previewServiceStatus.textContent = t("preview.serviceListening");
      el.previewServiceStatus.title = url;
    }
    if (el.previewStartService) el.previewStartService.hidden = true;
  } else if (status?.listening === false) {
    setServiceDot("down");
    if (el.previewServiceStatus) {
      el.previewServiceStatus.textContent = t("preview.serviceDown");
      el.previewServiceStatus.title = url;
    }
    if (el.previewStartService) {
      el.previewStartService.hidden = false;
      el.previewStartService.disabled = false;
    }
  } else {
    setServiceDot("busy");
    if (el.previewServiceStatus) {
      el.previewServiceStatus.textContent = t("preview.serviceChecking");
      el.previewServiceStatus.removeAttribute("title");
    }
    if (el.previewStartService) el.previewStartService.hidden = true;
  }
}

let previewStatusTimer = 0;
function stopPreviewStatusPoll() {
  if (previewStatusTimer) {
    clearInterval(previewStatusTimer);
    previewStatusTimer = 0;
  }
}

async function refreshPreviewServiceStatus() {
  if (!state.jobId || !el.previewPanel || el.previewPanel.hidden) {
    stopPreviewStatusPoll();
    return null;
  }
  const url = String(state.lastPreviewUrl || "").trim();
  if (!url || !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)) {
    paintPreviewServiceUi({ url, local: false, listening: null });
    stopPreviewStatusPoll();
    return null;
  }
  try {
    const res = await fetch(
      `/api/preview/status?jobId=${encodeURIComponent(state.jobId)}`,
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "status failed");
    if (body.url) state.lastPreviewUrl = body.url;
    paintPreviewServiceUi(body);
    return body;
  } catch {
    paintPreviewServiceUi({
      url,
      local: true,
      listening: false,
      canStart: true,
    });
    return null;
  }
}

function startPreviewStatusPoll() {
  void refreshPreviewServiceStatus();
  stopPreviewStatusPoll();
  previewStatusTimer = setInterval(() => {
    void refreshPreviewServiceStatus();
  }, 4000);
}

/** Absolute or same-origin href for chat preview links (http(s) or /api/…). */
function chatPreviewHref(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  // Keep desk-served paths root-relative so the host matches the open desk.
  if (u.startsWith("/")) return u;
  return "";
}

function isLocalHttpPreview(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(
    String(url || "").trim(),
  );
}

function openPreviewHref(url) {
  const u = String(url || "").trim();
  if (!u) return;
  const abs = /^https?:\/\//i.test(u)
    ? u
    : new URL(u, window.location.origin).href;
  window.open(abs, "_blank", "noopener");
}

/** Accepted-bubble link text + optional open chip for relative paths. */
function acceptedPreviewChatParts(previewUrl) {
  const raw = String(previewUrl || "").trim();
  const href = chatPreviewHref(raw);
  if (href) {
    return {
      link: t("preview.linkMd", { label: t("preview.view"), url: href }),
      actions: [],
    };
  }
  if (raw) {
    return {
      link: t("preview.link", { url: raw }),
      actions: [
        {
          label: t("preview.view"),
          onClick: () => {
            void ensureAndOpenPreview({ open: true });
          },
        },
      ],
    };
  }
  return { link: t("preview.missing"), actions: [] };
}

async function ensureAndOpenPreview({ open = true } = {}) {
  if (!state.jobId) {
    addBubble("bot", t("preview.startFail", { msg: t("err.noJob") }));
    return null;
  }
  const preferred = String(state.lastPreviewUrl || "").trim();

  // Focused desk snapshot / artifact / same-origin path: open that URL as-is.
  // Do not re-resolve delivery (latest revise may point at a different file).
  if (preferred.startsWith("/")) {
    paintPreviewServiceUi({ url: preferred, local: false, listening: null });
    if (open) openPreviewHref(preferred);
    return { ok: true, preview: { url: preferred }, openedPreferred: true };
  }

  // Public / non-local http(s): open focused URL directly.
  if (preferred && /^https?:\/\//i.test(preferred) && !isLocalHttpPreview(preferred)) {
    paintPreviewServiceUi({ url: preferred, local: false, listening: null });
    if (open) openPreviewHref(preferred);
    return { ok: true, preview: { url: preferred }, openedPreferred: true };
  }

  setPreviewOpenBusy(true);
  setServiceDot("busy");
  paintServiceStatusLine(t("preview.starting"));
  if (el.previewStartService) el.previewStartService.hidden = false;
  try {
    const res = await fetch("/api/preview/ensure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: state.jobId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "ensure failed");
    // Prefer the focused local service URL over whatever delivery currently says.
    const ensured = String(body.preview?.url || "").trim();
    const url =
      preferred && isLocalHttpPreview(preferred)
        ? preferred
        : ensured || preferred;
    if (url && !preferred) state.lastPreviewUrl = url;
    paintPreviewServiceUi({
      url,
      local: isLocalHttpPreview(url),
      listening: Boolean(body.alreadyRunning || body.started || body.ok),
      canStart: false,
    });
    if (body.started || body.alreadyRunning) {
      paintServiceStatusLine(t("preview.ready"));
      setServiceDot("up");
    }
    if (open && url) openPreviewHref(url);
    void refreshPreviewServiceStatus();
    return body;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    paintPreviewServiceUi({
      url: state.lastPreviewUrl,
      local: true,
      listening: false,
      canStart: true,
    });
    addBubble("bot", t("preview.startFail", { msg }));
    return null;
  } finally {
    setPreviewOpenBusy(false);
  }
}

function renderPreview(data) {
  if (!el.previewPanel) return;
  const wasHidden = el.previewPanel.hidden;
  state.lastStatus = data?.status || state.lastStatus;
  if (data?.dispatch) state.lastDispatch = data.dispatch;
  state.lastDeliveryAccepted =
    data?.delivery?.status === "accepted" || data?.status === "accepted";
  // Task finished / accepted: never leave the dispatch button stuck on「续派中」.
  if (
    state.lastDeliveryAccepted ||
    data?.status === "accepted" ||
    (data?.status !== "revising" && state.reviseLocked)
  ) {
    state.reviseDispatching = false;
  }
  const preview = data?.preview;
  const versions = Array.isArray(data?.results) ? data.results : [];
  const productReady =
    state.lastDeliveryAccepted ||
    data?.status === "revising" ||
    Number(data?.revision || 0) > 0 ||
    state.mode === "revise" ||
    state.reviseLocked ||
    versions.length > 0;
  const latest =
    versions.length > 0 ? versions[versions.length - 1] : null;
  const latestRev = latest
    ? Number(latest.revision) || 0
    : Number(data?.revision) || 0;
  // New revision arrived — snap focus to latest (follow the work).
  if (
    state.previewFocusRevision == null ||
    state.previewFollowLatest ||
    latestRev > Number(state.previewFocusRevision)
  ) {
    state.previewFocusRevision = latestRev;
    state.previewFollowLatest = true;
  }
  const focusRev = Number(state.previewFocusRevision) || 0;
  const focused =
    versions.find((v) => Number(v.revision) === focusRev) || latest;
  const openUrl = focused?.url || preview?.url || latest?.url || "";
  if (openUrl) state.lastPreviewUrl = openUrl;
  const folder = resultFolderPath(data);
  if (el.previewHeading) {
    el.previewHeading.textContent = resultHeadingText(focusRev);
  }
  if (!productReady) {
    el.previewPanel.hidden = true;
    stopPreviewStatusPoll();
  } else {
    el.previewPanel.hidden = false;
    const label = t("preview.view");
    if (el.previewLink) {
      el.previewLink.hidden = !openUrl;
      el.previewLink.textContent = label;
      el.previewLink.disabled = false;
    }
    if (el.previewDeploy) {
      el.previewDeploy.hidden = false;
      el.previewDeploy.disabled = Boolean(
        state.deployDispatching || state.busy || state.reviseDispatching,
      );
      el.previewDeploy.textContent = state.deployDispatching
        ? t("preview.deploying")
        : t("preview.deploy");
    }
    const canOpenFolder = Boolean(folder && state.jobId);
    if (el.previewOpenFolder) {
      el.previewOpenFolder.hidden = !canOpenFolder;
    }
    if (el.previewMissing) {
      el.previewMissing.hidden = Boolean(openUrl);
    }
    if (openUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(openUrl)) {
      if (el.previewService) {
        el.previewService.hidden = false;
        setServiceDot("busy");
        paintServiceStatusLine(t("preview.serviceChecking"));
      }
      startPreviewStatusPoll();
    } else if (openUrl) {
      paintPreviewServiceUi({ url: openUrl, local: false, listening: null });
      stopPreviewStatusPoll();
    } else {
      if (el.previewService) el.previewService.hidden = true;
      stopPreviewStatusPoll();
    }
  }
  renderPreviewVersions(versions, focusRev);
  renderRevisePanel(data);
  // Only when the result panel first appears — not on every status poll.
  if (!el.previewPanel.hidden && wasHidden) {
    focusRightPanel({ force: true });
    try {
      el.previewPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      /* ignore */
    }
  }
}

function renderPreviewVersions(versions, focusRev) {
  if (!el.previewVersions) return;
  el.previewVersions.replaceChildren();
  const list = Array.isArray(versions)
    ? versions.filter((entry) => entry?.url)
    : [];
  // One version is already the heading — only list history when there are more.
  if (list.length <= 1) {
    el.previewVersions.hidden = true;
    return;
  }
  el.previewVersions.hidden = false;
  const current = Number(focusRev) || 0;
  for (const entry of list) {
    const rev = Number(entry.revision) || 0;
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preview-version-link";
    if (rev === current) btn.classList.add("is-current");
    btn.textContent = versionChipLabel(rev);
    btn.title = entry.url || "";
    btn.addEventListener("click", () => {
      state.previewFocusRevision = rev;
      state.previewFollowLatest = rev === (Number(list[list.length - 1]?.revision) || 0);
      if (entry.url) {
        state.lastPreviewUrl = entry.url;
        if (el.previewHeading) {
          el.previewHeading.textContent = resultHeadingText(rev);
        }
        renderPreviewVersions(list, rev);
        if (el.previewLink) {
          el.previewLink.hidden = false;
        }
        const abs = /^https?:\/\//i.test(entry.url)
          ? entry.url
          : new URL(entry.url, window.location.origin).href;
        window.open(abs, "_blank", "noopener");
      }
    });
    li.appendChild(btn);
    el.previewVersions.appendChild(li);
  }
}

function renderRevisePanel(data) {
  if (!el.revisePanel) return;
  state.lastStatus = data?.status || state.lastStatus;
  if (data?.delivery?.status === "accepted") {
    state.lastDeliveryAccepted = true;
  } else if (data?.status === "revising") {
    state.lastDeliveryAccepted = false;
  }
  const accepted =
    data?.delivery?.status === "accepted" || data?.status === "accepted";
  const show =
    state.mode === "revise" ||
    state.reviseLocked ||
    (Boolean(data?.canRevise) &&
      (accepted ||
        data?.status === "revising" ||
        Number(data?.revision || 0) > 0));
  el.revisePanel.hidden = !show;
  const v = reviseCardValues();
  const ready =
    state.mode === "revise" &&
    Boolean(v.goal && v.acceptance) &&
    state.ready &&
    !state.busy &&
    !state.reviseDispatching;
  syncReviseDispatchButton(ready);
  // Never steal focus from an in-progress revise / architecture chat.
  if (
    show &&
    !state.reviseDialogueOpen &&
    state.mode !== "architecture" &&
    !state.reviseKickoffInFlight
  ) {
    focusRightPanel();
  }
}

/**
 * Post the visible user turn for「再改一版」into the revise thread.
 * Must run after switchChatLogForMode("revise") so the bubble is not wiped.
 */
function postReviseAgainUserMessage() {
  const text = t("user.reviseAgain");
  const last = state.reviseMessages[state.reviseMessages.length - 1];
  if (
    last?.role === "user" &&
    String(last.content || "") === text &&
    !isReviseSystemKick(last)
  ) {
    return text;
  }
  state.reviseMessages.push({ role: "user", content: text });
  addBubble("user", text);
  void persistProjectChat();
  return text;
}

function reviseDialogueHasAssistantReply() {
  return (state.reviseMessages || []).some(
    (m) => m?.role === "assistant" && String(m.content || "").trim(),
  );
}

/**
 * Enter / resume revise dialogue from「再改一版」.
 * Order: switch chat → visible user message → kickoff → then chrome
 * (chrome must not race the streaming bubble).
 */
function enterReviseMode() {
  maybeClearStaleBusy();
  if (state.busy) setBusy(false);
  if (!state.jobId) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("err.noJob");
    }
    addBubble("bot", t("err.noJob"));
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;

  // Drop any leftover deep IR and prior kickoff-fail bubbles before retry.
  scrubArchitectureIrMemory();
  stripReviseKickoffFailBubbles();

  // Already in revise dialogue: keep chat focused; re-kick only if idle
  // and the employee never answered (first click may have aborted).
  if (state.reviseDialogueOpen && state.mode === "revise" && !state.reviseLocked) {
    switchChatLogForMode("revise");
    el.input?.focus();
    scrollChatToLatest();
    if (
      !state.busy &&
      !state.reviseKickoffInFlight &&
      !reviseDialogueHasAssistantReply()
    ) {
      postReviseAgainUserMessage();
      void kickoffReviseDialogue().then((ok) => {
        if (ok) syncReviseChromeAfterKickoff();
      });
    } else {
      addBubble("bot", t("bot.continueRevise"));
      scrollChatToLatest();
    }
    return;
  }

  if (!state.originalCard) {
    const cur = cardValues();
    if (cur.goal || cur.acceptance) state.originalCard = { ...cur };
  }

  state.mode = "revise";
  state.reviseDialogueOpen = true;
  state.reviseLocked = false;
  state.reviseDispatching = false;
  state.revisePlanConfirmed = false;
  // New improve wave — prior 派工图 must not stay locked/ready.
  resetDispatchGraphForNewWave({ silent: true, hidePanel: true });
  // Keep prior revise dialogue history (do not wipe reviseMessages).
  // Advance to the next iteration card — never overwrite prior reviseCards.
  const nextRev = nextReviseRevisionNumber();
  state.reviseDraft = {
    revision: nextRev,
    goal: "",
    outOfScope: "",
    acceptance: "",
    assumptions: "",
  };
  state.reviseCardFocus = nextRev;

  // 1) Show revise thread + visible user turn immediately
  switchChatLogForMode("revise");
  postReviseAgainUserMessage();
  syncChatPlaceholder();
  el.input?.focus();
  scrollChatToLatest();

  // 2) Kick off employee reply first; chrome after success only
  void kickoffReviseDialogue().then((ok) => {
    if (ok) syncReviseChromeAfterKickoff();
  });
}

/** Null out any leftover architecture.ir graphs in desk memory. */
function scrubArchitectureIrMemory() {
  const wipe = (arch) => {
    if (arch && typeof arch === "object") arch.ir = null;
  };
  wipe(state.architecture);
  wipe(state.architecturePrevious);
  wipe(state.initialArchitecture);
  for (const entry of state.reviseCards || []) wipe(entry?.architecture);
}

/** Remove prior kickoff-fail assistant turns so retry can re-kick. */
function stripReviseKickoffFailBubbles() {
  const failRe =
    /改进对话启动失败|Maximum call stack|call stack size exceeded|内部数据过大/i;
  const before = state.reviseMessages || [];
  state.reviseMessages = before.filter(
    (m) =>
      !(
        m?.role === "assistant" &&
        failRe.test(String(m.content || ""))
      ),
  );
  if (state.reviseMessages.length !== before.length && el.log) {
    // Refresh visible log if we stripped fail bubbles.
    if (state.mode === "revise" || state.reviseDialogueOpen) {
      switchChatLogForMode("revise");
    }
  }
}

/** Card chrome after revise kickoff — must not flip lastDeliveryAccepted. */
function syncReviseChromeAfterKickoff() {
  if (state.mode !== "revise") return;
  try {
    scrubArchitectureIrMemory();
    syncArchitecturePanel();
    resetValidateGate();
    restoreConfirmCardFromOriginal();
    applyReviseFieldsFromCard(state.reviseDraft);
    setReviseFieldsReadonly(false);
    syncReqSections();
    applyCardChrome();
    syncReviseCardChrome({ rebuildAccordion: true });
    syncConfirmEnabled();
    void persistProjectChat();
    renderRevisePanel({
      canRevise: true,
      status: "revising",
    });
  } catch (err) {
    console.warn("[revise-chrome]", err);
  }
  el.input?.focus();
  scrollChatToLatest();
}

async function kickoffReviseDialogue() {
  if (state.reviseDispatching || state.mode !== "revise") return false;
  if (state.reviseKickoffInFlight) return false;
  state.reviseKickoffInFlight = true;
  for (let i = 0; i < 40 && state.busy; i += 1) {
    await new Promise((r) => setTimeout(r, 50));
  }
  maybeClearStaleBusy();
  if (state.busy) setBusy(false);
  if (state.mode !== "revise") {
    state.reviseKickoffInFlight = false;
    return false;
  }

  let streamBubble = null;
  let gotReply = false;
  let pushedKick = false;
  let stage = "init";
  let ok = false;

  try {
    scrubArchitectureIrMemory();
    stage = "busy";
    setBusy(true);
    setReviseDispatchBusy(true);
    stage = "bubble";
    streamBubble = startStreamingBubble();
    // No hidden system kick — visible user.reviseAgain + server followUp is enough.
    // Keep a short steer only if the bag has no user turn yet.
    const hasUser =
      Array.isArray(state.reviseMessages) &&
      state.reviseMessages.some(
        (m) => m?.role === "user" && !isReviseSystemKick(m),
      );
    if (!hasUser) {
      const kick = t("user.reviseAgain");
      state.reviseMessages.push({ role: "user", content: kick });
      pushedKick = true;
    }
    stage = "stringify";
    let body;
    try {
      body = JSON.stringify({
        messages: (state.reviseMessages || []).slice(-16).map((m) => ({
          role: m?.role === "user" ? "user" : "assistant",
          content: String(m?.content || "").slice(0, 8000),
        })),
        card: reviseCardValues(),
        mode: "revise",
        stream: true,
      });
    } catch (err) {
      const msg = String(err?.message || err || "");
      throw new Error(`kickoff-stringify: ${msg.slice(0, 160)}`);
    }
    stage = "fetch";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok && !ctype.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || t("err.reviseKickoff"));
    }
    if (ctype.includes("text/event-stream") && res.body) {
      let final = null;
      let streamError = null;
      stage = "stream";
      await readChatStream(res, (evt) => {
        if (evt.type === "delta" && evt.text) {
          streamBubble.append(evt.text);
          gotReply = true;
        } else if (evt.type === "done") final = evt;
        else if (evt.type === "error") {
          streamError = new Error(evt.error || t("err.chat"));
        }
      });
      const streamed = String(streamBubble.getText() || "").trim();
      if (streamError && !final && !streamed) throw streamError;
      if (!final && !streamed) throw new Error(t("err.streamIncomplete"));
      stage = "apply";
      if (final) {
        try {
          applyCard(final, { skipValidate: true });
        } catch {
          /* ignore */
        }
        if (final.reply) {
          streamBubble.set(final.reply);
          gotReply = true;
        }
        try {
          streamBubble.finish(final.options);
        } catch {
          streamBubble.finish();
        }
        state.reviseMessages.push({
          role: "assistant",
          content: final.reply || streamed,
        });
      } else {
        streamBubble.finish();
        state.reviseMessages.push({ role: "assistant", content: streamed });
      }
      void persistProjectChat();
    } else {
      stage = "json";
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("err.chat"));
      try {
        applyCard(data, { skipValidate: true });
      } catch {
        /* ignore */
      }
      streamBubble.set(data.reply || "");
      try {
        streamBubble.finish(data.options);
      } catch {
        streamBubble.finish();
      }
      gotReply = Boolean(data.reply);
      state.reviseMessages.push({ role: "assistant", content: data.reply });
      void persistProjectChat();
    }
    ok = true;
  } catch (err) {
    if (pushedKick) state.reviseMessages.pop();
    const streamed = String(streamBubble?.getText?.() || "").trim();
    const rawMsg = String(err?.message || err || "").trim();
    const friendly =
      rawMsg && rawMsg !== t("err.reviseKickoff")
        ? `${t("err.reviseKickoff")}: ${rawMsg.slice(0, 200)}`
        : t("err.reviseKickoff");
    console.warn("[revise-kickoff]", stage, err);
    if (gotReply || streamed) {
      try {
        streamBubble?.set(streamed);
        streamBubble?.finish();
      } catch {
        /* ignore */
      }
      state.reviseMessages.push({ role: "assistant", content: streamed });
      ok = true;
    } else if (streamBubble) {
      try {
        streamBubble.set(friendly);
        streamBubble.finish();
      } catch {
        addBubble("bot", friendly);
      }
      // Do not persist fail text as a real assistant reply — strip on retry.
      state.reviseMessages.push({ role: "assistant", content: friendly });
    } else {
      addBubble("bot", friendly);
      state.reviseMessages.push({ role: "assistant", content: friendly });
    }
  } finally {
    state.reviseKickoffInFlight = false;
    setBusy(false);
    setReviseDispatchBusy(false);
    void persistProjectChat();
    el.input?.focus();
    scrollChatToLatest();
  }
  return ok;
}

/** After revise dispatch: keep bottom 改进卡 visible with confirmed values (locked). */
function lockReviseCard(data, card) {
  state.mode = "specify"; // leave dialogue; chrome via reviseLocked
  state.reviseDialogueOpen = false;
  state.reviseKickoffInFlight = false;
  state.reviseLocked = true;
  state.reviseDispatching = false;
  state.revisePlanConfirmed = false;
  const rev = Number(data.revision) || 0;
  const prevFp = previousArchitectureFingerprint(rev);
  const curFp = architectureFpOf(state.architecture);
  const archChanged = Boolean(
    state.architecturePrevious ||
      (prevFp && curFp && prevFp !== curFp) ||
      (!prevFp && curFp && rev > 1),
  );
  const archSnap = architectureSnapshotFromState({ changed: archChanged });
  upsertReviseCardEntry(rev, card, archSnap);
  // Clear one-shot previous block after we recorded the change.
  if (archChanged) state.architecturePrevious = null;
  state.reviseDraft = null;
  state.reviseCardFocus = rev > 0 ? rev : state.reviseCardFocus;
  state.lastRevision = {
    revision: data.revision,
    change: card.goal,
    keep: card.outOfScope,
    acceptance: card.acceptance,
    reason: card.assumptions,
  };
  applyReviseFieldsFromCard(card);
  restoreConfirmCardFromOriginal();
  syncReqSections();
  syncChatPlaceholder();
  if (el.result) {
    el.result.hidden = false;
    el.result.textContent = t("result.revision", {
      revision: data.revision,
      goal: card.goal,
      acceptance: card.acceptance,
    });
  }
  setReviseFieldsReadonly(true);
  applyCardChrome();
  syncReviseCardChrome();
  if (el.chatPanel) el.chatPanel.classList.remove("revise-active");
  renderRevisePanel({
    canRevise: true,
    status: "revising",
    revision: data.revision,
  });
  beginRunBlock({
    revision: data.revision,
    note: t("run.note.revision", {
      goal: card.goal,
      acceptance: card.acceptance,
    }),
  });
  focusRightPanel({ force: true });
  void persistProjectChat();
}

/** Lock 改进卡 contents, then open architecture confirm/redesign gate. */
function confirmRevisePlan() {
  stashReviseDraftFromFields();
  state.revisePlanConfirmed = true;
  setReviseFieldsReadonly(true);
  syncConfirmEnabled();
  addBubble("bot", t("arch.afterRevisePlan"));
  void persistProjectChat();
  openReviseArchitectureGate();
}

/**
 * After 改进方案确认: require architecture confirm again (keep diagram as
 * preview, or redesign). Dispatch runs only after confirmArchitecture.
 */
function openReviseArchitectureGate() {
  if (state.architecture.url) {
    state.architecture.confirmed = false;
    state.architecture.status = "preview";
    state.architecture.ir = null;
    state.mode = "architecture";
    invalidateDispatchAfterArchChange();
    // Place diagram under「请先确认架构」CTA before scrolling.
    placeArchitecturePanelForFlow();
    syncArchitecturePanel();
    syncChatPlaceholder();
    syncComposerEnabled();
    schedulePersistProjectDesk();
    focusRightPanel({ force: true });
    try {
      // Prefer CTA then panel — user reads the cue, then confirms below.
      el.doReviseDispatch?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
      el.architecturePanel?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    } catch {
      /* ignore */
    }
    return;
  }
  beginArchitectureDesign({ kickoff: true });
}

async function confirmReviseAndDispatch() {
  if (!state.jobId || state.busy || state.reviseDispatching) return;
  const v = reviseCardValues();
  if (!v.goal || !v.acceptance) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("err.reviseFields");
    }
    return;
  }
  if (!validationAllowsSend("revise")) {
    scheduleValidate("revise");
    addBubble("bot", t("bot.needValidate"));
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;
  // Order: confirm 改进方案 → confirm architecture → dispatch.
  if (!state.revisePlanConfirmed) {
    confirmRevisePlan();
    return;
  }
  if (!state.architecture.confirmed) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("arch.needConfirmAfterPlan");
    }
    openReviseArchitectureGate();
    return;
  }
  if (!state.dispatchGraphReady || !state.taskPool?.tasks?.length) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("dispatch.needGraphConfirm");
    }
    void showDispatchPanel({ forceNewWave: !state.taskPool?.tasks?.length });
    return;
  }
  await dispatchReviseAgent();
}

async function dispatchReviseAgent() {
  if (!state.jobId || state.busy || state.reviseDispatching) return;
  if (!state.revisePlanConfirmed || !state.architecture.confirmed) return;
  const v = reviseCardValues();
  if (!v.goal || !v.acceptance) return;
  state.reviseDispatching = true;
  syncReviseDispatchButton(false);
  try {
    const body = {
      jobId: state.jobId,
      change: v.goal,
      keep: v.outOfScope,
      acceptance: v.acceptance,
      reason: v.assumptions,
      feedback: v.assumptions || v.goal,
      agentId: state.agentId,
    };
    const ac = new AbortController();
    // Cover recreate (git ≤60s) + optional duaer init (≤120s) + validate/launch headroom.
    const timer = setTimeout(() => ac.abort(), 180000);
    const res = await fetch("/api/revise", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    clearTimeout(timer);
    const rawText = await res.text();
    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      const snippet = String(rawText || "").replace(/\s+/g, " ").slice(0, 180);
      throw Object.assign(
        new Error(
          snippet
            ? `HTTP ${res.status}: ${snippet}`
            : `HTTP ${res.status} ${t("err.revise")}`,
        ),
        { retryable: true },
      );
    }
    if (res.status === 422 || data.passed === false) {
      if (data.card) applyCard(data.card, { skipValidate: true });
      state.validate = {
        kind: "revise",
        fingerprint: cardFingerprint(reviseCardValues()),
        status: "failed",
        summary: data.summary || data.error || "",
        issues: Array.isArray(data.issues) ? data.issues : [],
      };
      renderValidateHint();
      showAcceptFailed(data, { kind: "revise" });
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) {
      const err = new Error(reviseErrorMessage(data, res.status));
      err.retryable = data.retryable !== false;
      err.code = data.code || "";
      throw err;
    }
    resetValidateGate();
    const restated = data.restated
      ? t("bot.reviseRestate", {
          change: data.restated.change || "",
          acceptance: data.restated.acceptance || "",
        })
      : "";
    const launchLabel = data.launch?.preempted
      ? t("bot.reviseLaunchPreempt")
      : data.launch?.busy &&
          (data.launch?.reused || data.launch?.mode === "terminal-reuse")
        ? t("bot.reviseLaunchQueued")
        : data.launch?.reused || data.launch?.mode === "terminal-reuse"
          ? t("bot.reviseLaunchReuse")
          : data.continueSession
            ? t("bot.reviseLaunchContinue")
            : t("bot.reviseLaunchNew");
    addBubble(
      "bot",
      t("bot.reviseDispatched", {
        revision: data.revision,
        launch: launchLabel,
        restated,
      }),
    );
    lockReviseCard(data, v);
    void persistProjectChat();
    if (el.dispatchStatus) {
      el.dispatchStatus.hidden = false;
      el.dispatchStatus.textContent = t("status.revisingLine", {
        revision: data.revision,
      });
    }
    startStatusPoll();
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    const msg = timedOut
      ? t("err.reviseTimeout")
      : err instanceof Error
        ? err.message
        : t("err.revise");
    const retryable = timedOut || err?.retryable !== false;
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = retryable
        ? `${msg} ${t("err.retryableHint")}`
        : msg;
    }
    addBubble("bot", msg);
    // Keep plan confirmed; unlock fields only if validation failed path above.
    // Architecture stays confirmed so retry can re-dispatch.
  } finally {
    state.reviseDispatching = false;
    syncConfirmEnabled();
  }
}

function reviseErrorMessage(data, status) {
  const code = String(data?.code || "").trim();
  if (code) {
    const keyed = t(`err.code.${code}`);
    if (keyed && keyed !== `err.code.${code}`) return keyed;
  }
  return data?.error || `HTTP ${status} ${t("err.revise")}`;
}

function formatTerminalStatus(term) {
  if (!term || typeof term !== "object") return "";
  if (!term.runnerHealthy) return t("status.terminalDown");
  const parts = [
    term.busy ? t("status.terminalBusy") : t("status.terminalIdle"),
  ];
  const depth = Number(term.queueDepth || 0);
  if (depth > 0) parts.push(t("status.terminalQueue", { n: depth }));
  return parts.join(" · ");
}

function startStatusPoll() {
  stopStatusPoll();
  let acceptedNotified = false;
  let lastRevision = -1;
  const tick = async () => {
    const polledJobId = state.jobId;
    if (!polledJobId) return;
    try {
      const res = await fetch(
        `/api/status?jobId=${encodeURIComponent(polledJobId)}`,
      );
      // Project switch / clearDeskWorkspace may have moved on while we waited.
      if (state.jobId !== polledJobId) return;
      const data = await res.json();
      if (state.jobId !== polledJobId) return;
      if (!res.ok) return;
      applyDispatchStateFromStatus(data);
      renderProgress(data);
      renderPreview(data);
      const st = data.delivery?.status || data.status || "pending";
      if (data.status === "accepted" || data.delivery?.status === "accepted") {
        state.reviseDispatching = false;
        syncConfirmEnabled();
      }
      const pct =
        data.progress && data.progress.total
          ? `${data.progress.done}/${data.progress.total}`
          : "";
      const rev = data.revision > 0 ? ` · r${data.revision}` : "";
      el.dispatchStatus.textContent = t("status.poll", {
        st,
        pct: pct ? ` · ${pct}` : "",
        rev,
        wt:
          data.dispatch?.worktreeExists === false
            ? t("status.worktreeGone")
            : "",
      });
      const termLine = formatTerminalStatus(data.terminal);
      if (termLine) {
        el.dispatchStatus.textContent = `${el.dispatchStatus.textContent} · ${t(
          "status.terminalLine",
          { state: termLine },
        )}`;
      }
      // If revising but Terminal is stuck busy with no progress, keep「再改一版」visible.
      if (
        data.status === "revising" &&
        data.terminal?.busy &&
        data.terminal?.runnerHealthy &&
        !(data.progress?.done > 0)
      ) {
        state.reviseStuckHint = true;
      } else {
        state.reviseStuckHint = false;
      }
      if (state.jobId !== polledJobId) return;
      renderRevisePanel(data);
      if (data.status === "accepted" && data.delivery?.status === "accepted") {
        el.dispatchStatus.textContent = t("status.acceptedRevise", { rev });
        if (!acceptedNotified || data.revision !== lastRevision) {
          acceptedNotified = true;
          lastRevision = data.revision || 0;
          const { link, actions } = acceptedPreviewChatParts(
            data.preview?.url || state.lastPreviewUrl || "",
          );
          addBubble("bot", `${t("bot.accepted")}${link}`, { actions });
        }
        clearInterval(state.statusTimer);
        state.statusTimer = null;
      }
    } catch {
      // ignore poll errors
    }
  };
  void tick();
  state.statusTimer = setInterval(tick, 3000);
}

if (el.startReviseChat) {
  el.startReviseChat.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    enterReviseMode();
  });
}

if (el.startReviseChatAlt) {
  el.startReviseChatAlt.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    enterReviseMode();
  });
}

async function onOpenResultFolder() {
  await openResultFolder({ dispatch: state.lastDispatch });
}
el.previewOpenFolder?.addEventListener("click", () => {
  void onOpenResultFolder();
});
el.previewLink?.addEventListener("click", () => {
  void ensureAndOpenPreview({ open: true });
});
el.previewDeploy?.addEventListener("click", () => {
  openDeployPicker();
});
el.previewStartService?.addEventListener("click", () => {
  void ensureAndOpenPreview({ open: false });
});

const DEPLOY_HOST_IDS = ["cloudflare", "aliyun", "aws", "github-pages"];

function visibleDeployHostIds() {
  return DEPLOY_HOST_IDS.filter((id) => {
    if (id === "aliyun") return Boolean(state.lastCfg?.hasAliyunCredentials);
    if (id === "cloudflare")
      return Boolean(state.lastCfg?.hasCloudflareCredentials);
    if (id === "aws") return Boolean(state.lastCfg?.hasAwsCredentials);
    return true;
  });
}

function closeDeployPicker() {
  if (el.deployPicker) el.deployPicker.hidden = true;
}

function renderDeployPickerList() {
  if (!el.deployPickerList) return;
  el.deployPickerList.replaceChildren();
  const ids = visibleDeployHostIds();
  if (!ids.includes(state.deployPickerTarget)) {
    state.deployPickerTarget = ids.includes("github-pages")
      ? "github-pages"
      : ids[0] || "github-pages";
  }
  for (const id of ids) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "deploy-target-chip";
    b.setAttribute(
      "aria-pressed",
      id === state.deployPickerTarget ? "true" : "false",
    );
    b.textContent = t(`dispatch.deploy.${id}`);
    b.addEventListener("click", () => {
      state.deployPickerTarget = id;
      renderDeployPickerList();
    });
    el.deployPickerList.appendChild(b);
  }
}

function openDeployPicker() {
  if (!state.jobId || state.deployDispatching || state.busy) return;
  const hosts = visibleDeployHostIds();
  const current = state.deployTarget || "none";
  state.deployPickerTarget = hosts.includes(current)
    ? current
    : hosts.includes("github-pages")
      ? "github-pages"
      : hosts[0] || "github-pages";
  renderDeployPickerList();
  if (el.deployPickerTitle) {
    el.deployPickerTitle.textContent = t("preview.deployWhere");
  }
  if (el.deployPickerCancel) {
    el.deployPickerCancel.textContent = t("preview.deployCancel");
  }
  if (el.deployPickerConfirm) {
    el.deployPickerConfirm.textContent = t("preview.deployConfirm");
    el.deployPickerConfirm.disabled = false;
  }
  if (el.deployPicker) el.deployPicker.hidden = false;
}

el.deployPickerBackdrop?.addEventListener("click", () => closeDeployPicker());
el.deployPickerCancel?.addEventListener("click", () => closeDeployPicker());
el.deployPickerConfirm?.addEventListener("click", () => {
  const target = state.deployPickerTarget || "github-pages";
  closeDeployPicker();
  void startPreviewDeploy(target);
});
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  if (el.deployPicker && !el.deployPicker.hidden) {
    closeDeployPicker();
  }
});

async function startPreviewDeploy(targetRaw) {
  if (!state.jobId || state.deployDispatching || state.busy) return;
  const hosts = visibleDeployHostIds();
  const target = hosts.includes(targetRaw) ? targetRaw : "github-pages";
  state.deployTarget = target;
  renderDeployTargetList();
  void persistProjectChat();

  state.deployDispatching = true;
  if (el.previewDeploy) {
    el.previewDeploy.disabled = true;
    el.previewDeploy.textContent = t("preview.deploying");
  }
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 180000);
    const res = await fetch("/api/deploy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: state.jobId,
        agentId: state.agentId,
        deployTarget: target,
      }),
      signal: ac.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || t("err.deploy"));
    }
    if (data.deployTarget) {
      state.deployTarget = data.deployTarget;
      renderDeployTargetList();
    }
    const launchLabel = data.launch?.preempted
      ? t("bot.reviseLaunchPreempt")
      : data.launch?.busy &&
          (data.launch?.reused || data.launch?.mode === "terminal-reuse")
        ? t("bot.reviseLaunchQueued")
        : data.launch?.reused || data.launch?.mode === "terminal-reuse"
          ? t("bot.reviseLaunchReuse")
          : data.continueSession
            ? t("bot.reviseLaunchContinue")
            : t("bot.reviseLaunchNew");
    addBubble(
      "bot",
      t("bot.deployDispatched", {
        target: t(`dispatch.deploy.${data.deployTarget || target}`),
        revision: data.revision || "—",
        launch: launchLabel,
      }),
    );
    if (el.dispatchStatus) {
      el.dispatchStatus.hidden = false;
      el.dispatchStatus.textContent = t("status.revisingLine", {
        revision: data.revision || "—",
      });
    }
    startStatusPoll();
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    const msg = timedOut
      ? t("err.reviseTimeout")
      : err instanceof Error
        ? err.message
        : t("err.deploy");
    addBubble("bot", msg);
  } finally {
    state.deployDispatching = false;
    if (el.previewDeploy && el.previewPanel && !el.previewPanel.hidden) {
      el.previewDeploy.disabled = Boolean(state.busy || state.reviseDispatching);
      el.previewDeploy.textContent = t("preview.deploy");
    }
  }
}

if (el.doReviseDispatch) {
  el.doReviseDispatch.addEventListener("click", () => {
    void confirmReviseAndDispatch();
  });
}

function formatHistoryTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return d.toLocaleString(localeDateTag(), {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

function showHistoryErr(message) {
  if (!el.historyErr) return;
  const text = String(message || "").trim();
  el.historyErr.hidden = !text;
  el.historyErr.textContent = text;
  if (text) el.historyErr.scrollIntoView({ block: "nearest" });
}

function setHistoryOpen(open) {
  if (!el.historyPanel) return;
  const want = Boolean(open);
  if (want && el.settingsPanel && !el.settingsPanel.hidden) {
    if (!state.ready) {
      // Cannot open projects over mandatory first-time settings.
      return;
    }
    el.settingsPanel.hidden = true;
    if (el.cfgOpen) el.cfgOpen.setAttribute("aria-expanded", "false");
  }
  if (want && el.employeePanel && !el.employeePanel.hidden) {
    el.employeePanel.hidden = true;
    if (el.employeeToggle) {
      el.employeeToggle.setAttribute("aria-expanded", "false");
    }
  }
  el.historyPanel.hidden = !want;
  if (el.historyToggle) {
    el.historyToggle.setAttribute("aria-expanded", want ? "true" : "false");
  }
  syncDrawerBackdrop();
  if (want) void loadProjectsPanel();
}

function normalizePathKey(p) {
  return String(p || "")
    .trim()
    .replace(/[\\/]+$/, "");
}

async function loadProjectsPanel() {
  if (el.historyErr) el.historyErr.hidden = true;
  if (el.historyDetail) el.historyDetail.hidden = true;
  state.selectedHistoryId = null;
  try {
    const res = await fetch("/api/projects");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("project.fail"));
    state.projects = data.projects || [];
    state.unassignedJobs = data.unassigned || [];
    if (el.projectsRoot && data.projectsRoot != null) {
      el.projectsRoot.value = data.projectsRoot || el.projectsRoot.value || "";
    }
    if (data.activeProjectPath) {
      const active = (data.projects || []).find(
        (p) => normalizePathKey(p.path) === normalizePathKey(data.activeProjectPath),
      );
      setActiveProject(
        data.activeProjectPath,
        active?.title || active?.name,
        active?.description,
      );
    }
    renderProjectList();
    renderProjectConversations();
  } catch (err) {
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent =
        err instanceof Error ? err.message : t("project.fail");
    }
  }
}

function renderProjectList() {
  if (!el.projectList) return;
  el.projectList.replaceChildren();
  if (!state.projects.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = t("project.emptyList");
    el.projectList.appendChild(p);
    return;
  }
  const active = normalizePathKey(state.projectPath);
  for (const proj of state.projects) {
    const row = document.createElement("div");
    row.className = "project-row";
    const pressed = normalizePathKey(proj.path) === active;
    if (pressed) row.classList.add("is-active");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item project-item";
    btn.dataset.path = proj.path;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    const goal = document.createElement("span");
    goal.className = "history-item-goal";
    goal.textContent = proj.title || proj.name || proj.path;
    const st = document.createElement("span");
    st.className = `history-item-status project-status is-${proj.deliveryStatus || "drafting"}`;
    st.textContent = t(`project.status.${proj.deliveryStatus || "drafting"}`);
    const meta = document.createElement("span");
    meta.className = "history-item-meta";
    meta.textContent = proj.description
      ? `${proj.description} · ${proj.path}`
      : proj.path;
    btn.appendChild(goal);
    btn.appendChild(st);
    btn.appendChild(meta);
    btn.addEventListener("click", () => {
      void activateProjectPath(proj.path, {
        title: proj.title || proj.name,
        description: proj.description || "",
        requireMeta: false,
      });
    });
    row.appendChild(btn);

    if (proj.hasDeliverables) {
      const deliv = document.createElement("button");
      deliv.type = "button";
      deliv.className = "btn project-deliverables";
      deliv.textContent = t("deliverables.openShort");
      deliv.title = t("deliverables.openHint");
      deliv.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const open = async () => {
          if (normalizePathKey(state.projectPath) !== normalizePathKey(proj.path)) {
            await activateProjectPath(proj.path, {
              title: proj.title || proj.name,
              description: proj.description || "",
              requireMeta: false,
            });
          }
          openDeliverablesPage();
        };
        void open();
      });
      row.appendChild(deliv);
    }

    el.projectList.appendChild(row);
  }
}

function renderProjectConversations() {
  if (!el.historyList) return;
  el.historyList.replaceChildren();
  const active = normalizePathKey(state.projectPath);
  const proj = state.projects.find(
    (p) => normalizePathKey(p.path) === active,
  );
  const jobs = proj?.jobs || [];
  state.historyJobs = jobs;
  if (!active) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = t("project.gateHint");
    el.historyList.appendChild(p);
    return;
  }
  if (!jobs.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = t("history.empty");
    el.historyList.appendChild(p);
    return;
  }
  for (const job of jobs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item";
    btn.dataset.id = job.id;
    btn.setAttribute("aria-pressed", "false");
    const goal = document.createElement("span");
    goal.className = "history-item-goal";
    goal.textContent = job.goal || job.id;
    const st = document.createElement("span");
    st.className = "history-item-status";
    st.textContent = job.status || "—";
    const meta = document.createElement("span");
    meta.className = "history-item-meta";
    meta.textContent = t("history.meta", {
      status: job.status || "—",
      time: formatHistoryTime(job.at || job.confirmedAt),
    });
    btn.appendChild(goal);
    btn.appendChild(st);
    btn.appendChild(meta);
    btn.addEventListener("click", () => {
      void selectHistoryJob(job.id);
    });
    el.historyList.appendChild(btn);
  }
}

async function activateProjectPath(pathOrName, meta = {}) {
  const raw = String(pathOrName || "").trim();
  if (!raw) {
    showHistoryErr(t("project.needName"));
    return;
  }
  const requireMeta = meta.requireMeta !== false;
  const create = meta.create === true;
  const title = String(meta.title ?? "").trim();
  const description = String(meta.description ?? "").trim();
  if (requireMeta) {
    if (!title) {
      showHistoryErr(t("project.needTitle"));
      return;
    }
    if (!description) {
      showHistoryErr(t("project.needDesc"));
      return;
    }
  }
  if (el.projectActivate) el.projectActivate.disabled = true;
  showHistoryErr(t("project.working"));
  try {
    // Save outgoing project chat before switching.
    if (state.projectPath) await persistProjectChat();
    const body = { path: raw };
    if (requireMeta || title) body.title = title;
    if (requireMeta || description) body.description = description;
    if (requireMeta) body.requireMeta = true;
    if (create) body.create = true;
    const res = await fetch("/api/projects/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("project.fail"));
    state.projects = data.projects || [];
    state.unassignedJobs = data.unassigned || [];
    setActiveProject(
      data.path || data.activeProjectPath,
      data.title || data.name,
      data.description,
    );
    if (el.projectsRoot && data.projectsRoot != null) {
      el.projectsRoot.value = data.projectsRoot || "";
    }
    renderProjectList();
    renderProjectConversations();
    showHistoryErr("");
    setHistoryOpen(false);
    syncComposerEnabled();
    const name = data.title || data.name || data.path;
    const desc = String(data.description || "").trim();
    const background = desc
      ? t("project.kickoffBackground", { description: desc })
      : "";
    const restored = await loadProjectChatIntoUi(state.projectPath);
    const hasDesk =
      restored > 0 ||
      Boolean(state.jobId) ||
      Boolean((el.goal?.value || "").trim());
    if (hasDesk) {
      if (el.input) el.input.focus();
      return;
    }
    // New / empty project: start the requirements dialogue immediately.
    void sendChat(
      t("project.kickoff", {
        name,
        background,
      }),
    );
    if (el.input) el.input.focus();
  } catch (err) {
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent =
        err instanceof Error ? err.message : t("project.fail");
    }
    addBubble(
      "bot",
      err instanceof Error ? err.message : t("project.fail"),
    );
  } finally {
    if (el.projectActivate) el.projectActivate.disabled = false;
  }
}

async function loadHistoryList() {
  return loadProjectsPanel();
}

async function selectHistoryJob(jobId) {
  state.selectedHistoryId = jobId;
  for (const btn of el.historyList?.querySelectorAll(".history-item") || []) {
    btn.setAttribute(
      "aria-pressed",
      btn.dataset.id === jobId ? "true" : "false",
    );
  }
  if (el.historyDetail) el.historyDetail.hidden = false;
  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("history.loadFail"));
    state.selectedHistoryDetail = data;
    if (el.historyDetailGoal) {
      el.historyDetailGoal.textContent = data.card?.goal || data.goal || jobId;
    }
    if (el.historyDetailMeta) {
      el.historyDetailMeta.textContent = t("history.detailMeta", {
        id: data.id,
        status: data.jobStatus || data.status?.status || "—",
        time: formatHistoryTime(
          data.confirmedAt || data.status?.dispatch?.dispatchedAt,
        ),
      });
    }
    if (el.historyDetailBody) {
      const bits = [
        data.acceptance ? `Acceptance:\n${data.acceptance}` : "",
        data.outOfScope ? `Out of scope:\n${data.outOfScope}` : "",
        data.dispatch?.repoPath ? `Repo: ${data.dispatch.repoPath}` : "",
        data.dispatch?.worktreePath
          ? `Worktree: ${data.dispatch.worktreePath}`
          : "",
        data.revisionCount ? `Revisions: ${data.revisionCount}` : "",
      ].filter(Boolean);
      el.historyDetailBody.textContent = bits.join("\n\n") || data.id;
    }
  } catch (err) {
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent =
        err instanceof Error ? err.message : t("history.loadFail");
    }
  }
}

async function restoreHistoryJob() {
  const data = state.selectedHistoryDetail;
  if (!data?.id) return;
  if (!state.ready) {
    addBubble("bot", t("history.loadFail"));
    return;
  }
  state.jobId = data.id;
  state.mode = "specify";
  state.reviseLocked = false;
  state.reviseDispatching = false;
  state.lastRevision = null;
  state.reviseCards = [];
  state.bugCards = [];
  state.reviseDraft = null;
  state.reviseCardFocus = null;
  state.revisePlanConfirmed = false;
  state.initialArchitecture = null;
  state.reviseExpanded = {};
  clearRunTimeline();
  const card = data.card || {};
  el.goal.value = card.goal || "";
  el.outOfScope.value = card.outOfScope || "";
  el.acceptance.value = card.acceptance || "";
  el.assumptions.value = card.assumptions || "";
  state.originalCard = { ...cardValues() };
  const st = data.jobStatus || data.status?.status || "";
  state.locked = Boolean(st && st !== "unknown");
  syncReqSections();
  syncConfirmEnabled();
  if (data.dispatch?.repoPath || data.dispatch?.worktreePath || data.projectPath || data.repoPath) {
    const proj =
      data.dispatch?.repoPath || data.projectPath || data.repoPath || "";
    if (proj) setActiveProject(proj);
    el.dispatch.hidden = false;
    syncDispatchProjectLine();
    if (data.dispatch?.deployTarget) {
      state.deployTarget = data.dispatch.deployTarget;
    }
    renderDeployTargetList();
    if (el.repoPath) el.repoPath.value = proj || data.dispatch?.repoPath || "";
    el.dispatchStatus.hidden = false;
    el.dispatchStatus.textContent = t("status.poll", {
      st: st || "dispatched",
      pct: "",
      rev: data.revisionCount ? ` · r${data.revisionCount}` : "",
      wt: "",
    });
    state.dispatchPhase = "done";
    if (el.doDispatch) {
      el.doDispatch.disabled = true;
      el.doDispatch.textContent = t("dispatch.done");
    }
    markDispatchDone({ persist: true });
    await loadAgents();
    startStatusPoll();
    const statusData = data.status;
    if (statusData) {
      renderProgress(statusData);
      renderPreview(statusData);
    }
  }
  setHistoryOpen(false);
  addBubble("bot", t("history.restored", { id: data.id }));
  focusRightPanel({ force: true });
}

if (el.dispatchCenterToggle) {
  el.dispatchCenterToggle.addEventListener("click", () => {
    openDispatchCenterPage(state.projectPath);
  });
}
if (el.openTaskGraph) {
  el.openTaskGraph.addEventListener("click", () => {
    void openDispatchGraphPresent();
  });
}
if (el.redecomposeTasks) {
  el.redecomposeTasks.addEventListener("click", () => {
    const hadGraph =
      state.dispatchGraphReady ||
      Boolean(state.dispatchGraphUrl) ||
      state.dispatchGraphBuiltOnce;
    decomposeTasksFromModules();
    if (hadGraph && el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = t("dispatch.graphStale");
    }
  });
}
  if (el.confirmWorkersGraph) {
  el.confirmWorkersGraph.addEventListener("click", () => {
    void confirmWorkersAndBuildGraph();
  });
}
if (el.historyToggle) {
  el.historyToggle.addEventListener("click", () => {
    const open = el.historyPanel?.hidden !== false;
    setHistoryOpen(open);
  });
}
if (el.employeeToggle) {
  el.employeeToggle.addEventListener("click", () => {
    const open = el.employeePanel?.hidden !== false;
    setEmployeeOpen(open);
  });
}
if (el.employeeClose) {
  el.employeeClose.addEventListener("click", () => setEmployeeOpen(false));
}
el.openDeliverables?.addEventListener("click", () => {
  openDeliverablesPage();
});
if (el.historyClose) {
  el.historyClose.addEventListener("click", () => setHistoryOpen(false));
}
if (el.historyBackdrop) {
  el.historyBackdrop.addEventListener("click", () => {
    if (el.settingsPanel && !el.settingsPanel.hidden) {
      if (state.ready) setSettingsOpen(false);
      return;
    }
    if (el.employeePanel && !el.employeePanel.hidden) {
      setEmployeeOpen(false);
      return;
    }
    setHistoryOpen(false);
  });
}
if (el.historyRestore) {
  el.historyRestore.addEventListener("click", () => {
    void restoreHistoryJob();
  });
}

el.projectActivate?.addEventListener("click", () => {
  const raw = (el.projectFolder?.value || "").trim();
  void activateProjectPath(raw, {
    title: (el.projectTitle?.value || "").trim(),
    description: (el.projectDescription?.value || "").trim(),
    requireMeta: true,
    create: true,
  });
});

el.projectBrowse?.addEventListener("click", async () => {
  if (el.historyErr) el.historyErr.hidden = true;
  el.projectBrowse.disabled = true;
  el.projectBrowse.textContent = t("dispatch.browsing");
  try {
    const res = await fetch("/api/repos/pick", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      if (data.cancelled) return;
      throw new Error(data.error || t("err.pick"));
    }
    if (data.path) {
      if (el.projectFolder) el.projectFolder.value = data.path;
      const title = (el.projectTitle?.value || "").trim();
      const description = (el.projectDescription?.value || "").trim();
      if (!title || !description) {
        showHistoryErr(
          !title ? t("project.needTitle") : t("project.needDesc"),
        );
        return;
      }
      await activateProjectPath(data.path, {
        title,
        description,
        requireMeta: true,
        create: false,
      });
    }
  } catch (err) {
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent =
        err instanceof Error ? err.message : t("project.fail");
    }
  } finally {
    el.projectBrowse.disabled = false;
    el.projectBrowse.textContent = t("project.browse");
  }
});

onLocaleChange(() => {
  syncDynamicI18n();
  applyConfirmCardChrome();
  syncReviseCardChrome();
  paintDeliveryCockpit();
  renderProjectList();
  renderWorkerCountList();
  syncTaskPoolPreview();
  syncVoiceButtonUi();
  if (el.employeePanel && !el.employeePanel.hidden) renderEmployeeList();
  if (el.previewPanel && !el.previewPanel.hidden && state.lastStatus) {
    renderPreview(state.lastStatus);
  } else {
    void refreshPreviewServiceStatus();
  }
  if (el.historyPanel && !el.historyPanel.hidden) void loadHistoryList();
});

const initialLocale = initI18n();
initTheme();
syncThemeToggleUi();
if (el.themeToggle) {
  el.themeToggle.addEventListener("click", () => {
    toggleTheme();
    syncThemeToggleUi();
  });
}
if (el.langSelect) {
  el.langSelect.value = initialLocale;
  el.langSelect.addEventListener("change", () => {
    setLocale(el.langSelect.value);
  });
}
applyDomI18n();
syncThemeToggleUi();
syncChatPlaceholder();
wireReqSections();
syncComposerEnabled();
renderWorkerCountList();
wirePanelScrollHold(el.cardPanel);
wirePanelScrollHold(el.progressCol);
wireChatQuickNav();

if (el.autoFixCard) {
  el.autoFixCard.addEventListener("click", () => {
    void autoHandleFromGate("confirm", el.autoFixCard);
  });
}
if (el.autoFixRevise) {
  el.autoFixRevise.addEventListener("click", () => {
    void autoHandleFromGate("revise", el.autoFixRevise);
  });
}

void loadConfig();
startGithubStarsPolling();
