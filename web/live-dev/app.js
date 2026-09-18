/**
 * Duaer-spec FED UI — model-backed dialogue; Briefs go to ~/.duaer/live/jobs.
 */

import {
  t,
  initI18n,
  onLocaleChange,
  getLocale,
  setLocale,
  applyDomI18n,
} from "./i18n.js";
import { structuredHtml, escapeHtml, reqEditModel, serializeReqEdit } from "./structured-html.mjs";
import { extractArchitectureIr } from "./architecture-ir.mjs";
import { enrichChatOptions } from "./choice-options.mjs";

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
  /** True while POST /api/revise is in flight (not chat). */
  reviseDispatching: false,
  mode: "specify", // specify | revise | architecture
  /** After a successful revise: right card stays locked 改进卡. */
  reviseLocked: false,
  /**
   * Architecture gate (after confirm, before dispatch).
   * status: idle | designing | preview | confirmed
   */
  architecture: {
    status: "idle",
    ir: null,
    url: null,
    summary: "",
    confirmed: false,
  },
  architectureMessages: [],
  /** Revising but Terminal busy with no task progress — offer retry CTA. */
  reviseStuckHint: false,
  lastRevision: null, // { revision, change, keep, acceptance, reason }
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
  chatEmpty: document.getElementById("chatEmpty"),
  form: document.getElementById("composer"),
  input: document.getElementById("input"),
  goal: document.getElementById("goal"),
  outOfScope: document.getElementById("outOfScope"),
  acceptance: document.getElementById("acceptance"),
  assumptions: document.getElementById("assumptions"),
  goalView: document.getElementById("goalView"),
  outOfScopeView: document.getElementById("outOfScopeView"),
  acceptanceView: document.getElementById("acceptanceView"),
  assumptionsView: document.getElementById("assumptionsView"),
  confirm: document.getElementById("confirm"),
  result: document.getElementById("result"),
  lockHint: document.getElementById("lockHint"),
  validateHint: document.getElementById("validateHint"),
  reviseValidateHint: document.getElementById("reviseValidateHint"),
  autoFixCard: document.getElementById("autoFixCard"),
  autoFixRevise: document.getElementById("autoFixRevise"),
  meta: document.getElementById("meta"),
  send: document.getElementById("send"),
  cfgProviders: document.getElementById("cfgProviders"),
  cfgBase: document.getElementById("cfgBase"),
  cfgKey: document.getElementById("cfgKey"),
  cfgModel: document.getElementById("cfgModel"),
  saveCfg: document.getElementById("saveCfg"),
  cfgOpen: document.getElementById("cfgOpen"),
  cfgBack: document.getElementById("cfgBack"),
  cfgErr: document.getElementById("cfgErr"),
  dispatch: document.getElementById("dispatch"),
  repoList: document.getElementById("repoList"),
  repoPath: document.getElementById("repoPath"),
  projectsRoot: document.getElementById("projectsRoot"),
  saveProjectsRoot: document.getElementById("saveProjectsRoot"),
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
  architectureHint: document.getElementById("architectureHint"),
  architectureSummary: document.getElementById("architectureSummary"),
  architectureFrame: document.getElementById("architectureFrame"),
  architectureConfirm: document.getElementById("architectureConfirm"),
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
  progressCol: document.querySelector(".progress-col"),
  progressEmpty: document.getElementById("progressEmpty"),
  runTimeline: document.getElementById("runTimeline"),
  previewPanel: document.getElementById("previewPanel"),
  previewLink: document.getElementById("previewLink"),
  previewMeta: document.getElementById("previewMeta"),
  previewVersions: document.getElementById("previewVersions"),
  revisePanel: document.getElementById("revisePanel"),
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
  lblGoal: document.getElementById("lblGoal"),
  lblOut: document.getElementById("lblOut"),
  lblAccept: document.getElementById("lblAccept"),
  acceptHint: document.getElementById("acceptHint"),
  lblAssume: document.getElementById("lblAssume"),
  chatPanel: document.querySelector(".chat-panel"),
  cardPanel: document.querySelector(".card-panel"),
  updateNotice: document.getElementById("updateNotice"),
  langSelect: document.getElementById("langSelect"),
  historyToggle: document.getElementById("historyToggle"),
  projectBadge: document.getElementById("projectBadge"),
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

function scrollPanelToTarget(panel, target, { smooth = true, force = false } = {}) {
  if (!panel || !target || panel.hidden || !target.isConnected) return;
  try {
    const panelRect = panel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const pad = 16;
    const above = targetRect.top < panelRect.top + pad;
    const below = targetRect.bottom > panelRect.bottom - pad;
    if (!force && !above && !below) return;
    const nextTop = panel.scrollTop + (targetRect.top - panelRect.top) - pad;
    panel.scrollTo({
      top: Math.max(0, nextTop),
      behavior: smooth ? "smooth" : "auto",
    });
  } catch {
    target.scrollIntoView({
      block: "nearest",
      behavior: smooth ? "smooth" : "auto",
    });
  }
}

/** Scroll requirements and/or progress columns to the active stage. */
function focusRightPanel({ smooth = true, force = false } = {}) {
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
}

function maybeClearStaleBusy() {
  if (!state.busy || !state.busySince) return false;
  if (Date.now() - state.busySince < BUSY_STALE_MS) return false;
  setBusy(false);
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
  if (el.input) el.input.disabled = !state.ready || !state.projectPath;
  syncChatPlaceholder();
  syncProjectGateHint();
  syncProjectBadge();
}

function syncProjectBadge() {
  if (!el.projectBadge) return;
  if (state.projectPath) {
    el.projectBadge.textContent = t("project.activeBadge", {
      name: state.projectName || state.projectPath,
    });
    el.projectBadge.classList.add("is-active");
    el.projectBadge.classList.remove("is-empty");
  } else {
    el.projectBadge.textContent = t("project.noneBadge");
    el.projectBadge.classList.add("is-empty");
    el.projectBadge.classList.remove("is-active");
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
  syncComposerEnabled();
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

function syncDynamicI18n() {
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
    goal: el.goal.value.trim(),
    outOfScope: el.outOfScope.value.trim(),
    acceptance: el.acceptance.value.trim(),
    assumptions: el.assumptions.value.trim(),
  };
}

function reviseCardValues() {
  return {
    goal: (el.revGoal?.value || "").trim(),
    outOfScope: (el.revOut?.value || "").trim(),
    acceptance: (el.revAccept?.value || "").trim(),
    assumptions: (el.revAssume?.value || "").trim(),
  };
}

function setConfirmFieldsReadonly(ro) {
  for (const id of ["goal", "outOfScope", "acceptance", "assumptions"]) {
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
  syncReqSections();
}

/** Top confirm card chrome never becomes 改进卡. */
function applyConfirmCardChrome() {
  if (el.cardMark) el.cardMark.textContent = t("card.mark");
  if (el.cardTitle) el.cardTitle.textContent = t("card.title");
  if (el.lblGoal) el.lblGoal.textContent = t("card.goal");
  if (el.lblOut) el.lblOut.textContent = t("card.out");
  if (el.lblAccept) el.lblAccept.textContent = t("card.accept");
  if (el.acceptHint) el.acceptHint.textContent = t("card.acceptHint");
  if (el.lblAssume) el.lblAssume.textContent = t("card.assume");
}

function cardFingerprint(v) {
  return JSON.stringify({
    goal: String(v.goal || "").trim(),
    outOfScope: String(v.outOfScope || "").trim(),
    acceptance: String(v.acceptance || "").trim(),
    assumptions: String(v.assumptions || "").trim(),
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

function validationAllowsSend(kind) {
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  if (!v.goal || !v.acceptance) return false;
  return (
    state.validate.kind === kind &&
    state.validate.status === "passed" &&
    state.validate.fingerprint === cardFingerprint(v)
  );
}

function scheduleValidate(kind = currentValidateKind()) {
  if (state.locked && kind === "confirm") return;
  if (state.reviseLocked && kind === "revise") return;
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  if (!v.goal || !v.acceptance || !state.ready) {
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
  if (!v.goal || !v.acceptance || !state.ready) {
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
      body: JSON.stringify(v),
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
  const fieldsOk = Boolean(v.goal && v.acceptance);
  const validated = validationAllowsSend("confirm");
  const ok =
    fieldsOk && !state.locked && state.ready && validated && !state.busy;
  el.confirm.disabled = !ok;
  if (state.locked) {
    el.lockHint.textContent = t("card.lockHintLocked");
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
  if (!state.locked) {
    el.confirm.textContent =
      state.validate.status === "checking"
        ? t("card.validating")
        : t("card.confirm");
  } else {
    el.confirm.textContent = t("card.confirmed");
    el.confirm.disabled = true;
  }
  setConfirmFieldsReadonly(state.locked);
  syncReviseDispatchButton(false);
  syncAutoHandleButtons();
}

function syncReviseDispatchButton(ready) {
  if (!el.doReviseDispatch) return;
  const dialoguing = state.mode === "revise";
  const showCard =
    dialoguing || state.reviseLocked || Boolean(state.lastRevision);
  if (el.reviseCardFields) {
    el.reviseCardFields.hidden = !showCard && !dialoguing;
  }
  const showDispatch = dialoguing && !state.reviseLocked;
  el.doReviseDispatch.hidden = !showDispatch;
  el.doReviseDispatch.disabled =
    !ready ||
    state.busy ||
    state.reviseDispatching ||
    !state.architecture.confirmed;
  if (showDispatch) {
    el.doReviseDispatch.textContent = !state.architecture.confirmed
      ? t("arch.needConfirm")
      : state.reviseDispatching
        ? t("revise.dispatching")
        : t("revise.dispatch");
  }
  if (state.reviseLocked && !dialoguing) {
    setReviseFieldsReadonly(true);
  } else if (dialoguing) {
    setReviseFieldsReadonly(false);
  }
  const status = state.lastStatus;
  const accepted = state.lastDeliveryAccepted || status === "accepted";
  const revising = status === "revising";
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
    const showCta =
      !dialoguing && accepted && (!revising || state.reviseStuckHint);
    const previewVisible = el.previewPanel && !el.previewPanel.hidden;
    if (el.startReviseChat) {
      el.startReviseChat.hidden = !(showCta && previewVisible);
      el.startReviseChat.disabled = state.reviseDispatching || state.busy;
      el.startReviseChat.textContent = t("revise.again");
    }
    if (el.startReviseChatAlt) {
      el.startReviseChatAlt.hidden = !(showCta && !previewVisible);
      el.startReviseChatAlt.disabled = state.reviseDispatching || state.busy;
      el.startReviseChatAlt.textContent = t("revise.again");
    }
  }
  if (el.chatPanel) {
    el.chatPanel.classList.toggle("revise-active", dialoguing);
  }
}

function applyCardChrome() {
  // Confirm card styling/labels stay fixed; revise uses the bottom card only.
  applyConfirmCardChrome();
  syncConfirmEnabled();
}

["goal", "outOfScope", "acceptance", "assumptions"].forEach((id) => {
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
      schedulePersistProjectDesk();
      if (state.reviseLocked) return;
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
      el.input.value = opt;
      el.form.requestSubmit();
    });
    row.appendChild(b);
  }
  host.appendChild(row);
  scrollChatToLatest();
}

/** Keep focus in chat while designing architecture; otherwise follow card stage. */
function afterChatBubbleUi({ forceRight = false } = {}) {
  scrollChatToLatest();
  if (state.mode === "architecture" && !forceRight) {
    el.input?.focus();
    return;
  }
  focusRightPanel({ force: forceRight });
}

function architectureContinueOptions(parsed) {
  const hasIr =
    parsed?.ready &&
    (Array.isArray(parsed.components) || parsed.diagram_type === "architecture");
  if (hasIr) return [];
  if (Array.isArray(parsed?.options) && parsed.options.length) {
    return parsed.options;
  }
  return [t("arch.optDrawNow"), t("arch.optStorage"), t("arch.optChangePath")];
}

function addBubble(role, text, { options, actions } = {}) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  const textNode = document.createTextNode(text);
  div.appendChild(textNode);
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
  return { div, textNode };
}

function startStreamingBubble() {
  const { div, textNode } = addBubble("bot", "");
  div.classList.add("streaming");
  return {
    append(chunk) {
      textNode.textContent += chunk;
      scrollChatToLatest();
    },
    set(text) {
      textNode.textContent = text;
      scrollChatToLatest();
    },
    finish(options) {
      div.classList.remove("streaming");
      const reply = textNode.textContent || "";
      const opts = enrichChatOptions(reply, options);
      appendOptionChips(div, opts);
      afterChatBubbleUi();
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
    await fetch("/api/projects/chat", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectPath: state.projectPath,
        messages: state.messages,
        reviseMessages: state.reviseMessages,
        rawAsk: state.rawAsk || "",
        card: cardValues(),
        reviseCard: reviseCardValues(),
        originalCard: state.originalCard,
        jobId: state.jobId,
        locked: state.locked,
        mode: state.mode,
        reviseLocked: state.reviseLocked,
        lastRevision: state.lastRevision,
        deployTarget: state.deployTarget || "none",
        agentId: state.agentId || "",
        architecture: {
          status: state.architecture.status,
          ir: state.architecture.ir,
          url: state.architecture.url,
          summary: state.architecture.summary,
          confirmed: state.architecture.confirmed,
        },
        architectureMessages: state.architectureMessages,
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
  const fieldsOk = Boolean(values.goal && values.acceptance);
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
 * Load saved desk session (chat + 需求卡 + job/任务绑定) for a project.
 * @returns {Promise<number>} message count restored
 */
async function loadProjectChatIntoUi(projectPath) {
  const abs = String(projectPath || "").trim();
  if (!abs) {
    state.messages = [];
    state.reviseMessages = [];
    state.rawAsk = "";
    state.jobId = null;
    state.locked = false;
    state.mode = "specify";
    state.reviseLocked = false;
    state.originalCard = null;
    state.lastRevision = null;
    applySavedCardFields(null, null);
    resetValidateGate();
    clearChatLog();
    return 0;
  }
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
    state.reviseLocked = Boolean(data.reviseLocked);
    state.originalCard = data.originalCard || null;
    state.lastRevision = data.lastRevision || null;
    if (data.deployTarget) state.deployTarget = data.deployTarget;
    if (data.agentId) state.agentId = data.agentId;
    if (data.architecture && typeof data.architecture === "object") {
      state.architecture = {
        status: data.architecture.status || "idle",
        ir: data.architecture.ir || null,
        url: data.architecture.url || null,
        summary: data.architecture.summary || "",
        confirmed: Boolean(data.architecture.confirmed),
      };
    }
    state.architectureMessages = Array.isArray(data.architectureMessages)
      ? data.architectureMessages
      : [];
    applySavedCardFields(data.card, data.reviseCard);
    setConfirmFieldsReadonly(state.locked);
    setReviseFieldsReadonly(state.reviseLocked);
    applyConfirmCardChrome();
    applyCardChrome();
    renderMessagesToLog(state.messages);
    if (
      state.mode === "architecture" ||
      (state.locked && !state.architecture.confirmed)
    ) {
      appendArchitectureMessagesToLog();
    }
    restoreValidateGate(data.validate);
    syncArchitecturePanel(
      state.locked && !state.architecture.confirmed ? "stale" : undefined,
    );
    syncConfirmEnabled();
    syncComposerEnabled();
    if (state.jobId) {
      if (el.dispatch) el.dispatch.hidden = false;
      syncDispatchProjectLine();
      if (state.locked && el.confirm) {
        el.confirm.textContent = t("card.confirmed");
        el.confirm.disabled = true;
      }
      startStatusPoll();
      void loadAgents();
    }
    if (
      state.locked &&
      !state.architecture.confirmed &&
      state.mode !== "revise"
    ) {
      beginArchitectureDesign({
        kickoff: !state.architectureMessages.some((m) => m.role === "assistant"),
      });
      if (state.architectureMessages.some((m) => m.role === "assistant")) {
        maybeNudgeArchitectureContinue();
      }
    }
    return state.messages.length;
  } catch {
    state.messages = [];
    state.reviseMessages = [];
    state.rawAsk = "";
    state.jobId = null;
    state.locked = false;
    state.mode = "specify";
    state.reviseLocked = false;
    state.originalCard = null;
    state.lastRevision = null;
    applySavedCardFields(null, null);
    resetValidateGate();
    clearChatLog();
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
        mode:
          state.mode === "revise"
            ? "revise"
            : state.mode === "architecture"
              ? "architecture"
              : "specify",
        deployTarget: state.deployTarget || "none",
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
        await maybeRenderArchitectureFromReply(
          `${final.reply || ""}\n${JSON.stringify(final)}`,
        );
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
        await maybeRenderArchitectureFromReply(
          `${data.reply || ""}\n${JSON.stringify(data.architectureIr || data)}`,
        );
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
    if (data.goal && el.revGoal) el.revGoal.value = data.goal;
    if (data.outOfScope && el.revOut) el.revOut.value = data.outOfScope;
    if (data.acceptance && el.revAccept) el.revAccept.value = data.acceptance;
    if (data.assumptions && el.revAssume) el.revAssume.value = data.assumptions;
  } else if (state.locked) {
    // Confirmed Brief stays frozen; chat remains conversational only.
    syncConfirmEnabled();
    return;
  } else {
    if (data.goal) el.goal.value = data.goal;
    if (data.outOfScope) el.outOfScope.value = data.outOfScope;
    if (data.acceptance) el.acceptance.value = data.acceptance;
    if (data.assumptions) el.assumptions.value = data.assumptions;
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
    (el.settingsPanel && !el.settingsPanel.hidden);
  el.historyBackdrop.hidden = !open;
  document.body.classList.toggle("history-open", Boolean(open));
}

function setSettingsOpen(open) {
  if (!el.settingsPanel) return;
  const want = Boolean(open);
  if (!want && !state.ready) {
    // First-time config: keep drawer open until saved.
    return;
  }
  if (want && el.historyPanel && !el.historyPanel.hidden) {
    el.historyPanel.hidden = true;
    if (el.historyToggle) {
      el.historyToggle.setAttribute("aria-expanded", "false");
    }
  }
  el.settingsPanel.hidden = !want;
  if (el.cfgOpen) {
    el.cfgOpen.setAttribute("aria-expanded", want ? "true" : "false");
  }
  if (el.settingsClose) {
    el.settingsClose.hidden = !state.ready;
  }
  syncDrawerBackdrop();
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
  const id = cfg?.provider || "deepseek";
  applyProvider(id, { fillEmptyOnly: Boolean(cfg?.baseUrl || cfg?.model) });
  if (!state.ready) {
    if (el.desk) el.desk.hidden = true;
  }
  setSettingsOpen(true);
}

function showDesk(cfg) {
  if (el.desk) el.desk.hidden = false;
  state.ready = true;
  state.lastCfg = { ...cfg, ready: true };
  setSettingsOpen(false);
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

async function loadConfig() {
  const res = await fetch("/api/health");
  const cfg = await res.json();
  showUpdateNotice(cfg.update);
  if (cfg.ready) showDesk(cfg);
  else showSetup(cfg);
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
  el.input.value = "";
  void sendChat(text);
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
  if (!v.goal || !v.acceptance || state.locked || state.busy) return;
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
        rawAsk: state.rawAsk || v.goal,
        projectPath: state.projectPath || undefined,
        repoPath: state.projectPath || undefined,
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
      body: JSON.stringify({ ...v, issues }),
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
  state.locked = true;
  state.jobId = data.jobId || null;
  state.originalCard = cardValues();
  clearRunTimeline();
  el.confirm.textContent = t("card.confirmed");
  el.result.hidden = false;
  const reviewLine = data.review?.summary
    ? t("result.review", { summary: data.review.summary })
    : data.fixSummary
      ? t("result.fix", { summary: data.fixSummary })
      : "";
  el.result.textContent = t("result.confirmOk", {
    review: reviewLine,
    dir: data.relativeDir || data.featureDir,
    branch: data.branch,
  });
  addBubble(
    "bot",
    data.fixed ? t("bot.confirmFixed") : t("bot.confirmOk"),
  );
  syncConfirmEnabled();
  void persistProjectChat();
  await showDispatchPanel();
  beginArchitectureDesign({ kickoff: true });
}

function resetArchitecture({ stale = false } = {}) {
  state.architecture = {
    status: stale ? "idle" : "idle",
    ir: null,
    url: null,
    summary: "",
    confirmed: false,
  };
  state.architectureMessages = [];
  syncArchitecturePanel(stale ? "stale" : "need");
}

function architectureEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw, window.location.origin);
    u.searchParams.set("embed", "1");
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return raw.includes("?") ? `${raw}&embed=1` : `${raw}?embed=1`;
  }
}

function syncArchitecturePanel(kind) {
  if (!el.architecturePanel) return;
  el.architecturePanel.hidden = false;
  const a = state.architecture;
  if (el.architectureSummary) {
    el.architectureSummary.hidden = !(a.url && a.summary);
    el.architectureSummary.textContent = a.url ? a.summary || "" : "";
  }
  if (el.architectureFrame) {
    if (a.url) {
      el.architectureFrame.hidden = false;
      el.architectureFrame.src = architectureEmbedUrl(a.url);
      const vb = a.ir?.meta?.viewBox;
      const h =
        Array.isArray(vb) && Number.isFinite(vb[1])
          ? Math.max(240, Math.ceil(Number(vb[1]) + 32))
          : 480;
      el.architectureFrame.style.height = `${h}px`;
    } else {
      el.architectureFrame.hidden = true;
      el.architectureFrame.removeAttribute("src");
      el.architectureFrame.style.removeProperty("height");
    }
  }
  if (el.architectureConfirm) {
    const canConfirm = a.status === "preview" && a.url && !a.confirmed;
    el.architectureConfirm.hidden = !canConfirm && a.status !== "confirmed";
    if (a.confirmed) {
      el.architectureConfirm.hidden = false;
      el.architectureConfirm.disabled = true;
      el.architectureConfirm.textContent = t("arch.confirmed");
    } else {
      el.architectureConfirm.disabled = !canConfirm || state.busy;
      el.architectureConfirm.textContent = t("arch.confirm");
    }
  }
  if (el.architectureHint) {
    if (kind === "stale" || (a.status === "idle" && state.locked && !a.confirmed)) {
      el.architectureHint.textContent = t(
        kind === "stale" ? "arch.hintStale" : "arch.hintNeed",
      );
    } else if (a.confirmed) {
      el.architectureHint.textContent = t("arch.hintConfirmed");
    } else if (a.status === "preview") {
      el.architectureHint.textContent = t("arch.hintPreview");
    } else if (a.status === "designing") {
      el.architectureHint.textContent = t("arch.hintDesigning");
    } else {
      el.architectureHint.textContent = t("arch.hintNeed");
    }
  }
  syncDispatchButton();
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
  state.architecture.confirmed = false;
  state.architecture.status = "designing";
  state.mode = "architecture";
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
  addBubble("bot", t("arch.enterDesign"));
  scrollChatToLatest();
  el.input?.focus();
  setBusy(true);
  const streamBubble = startStreamingBubble();
  const kick = t("arch.kickoffInternal", { target });
  state.architectureMessages.push({ role: "user", content: kick });
  void persistProjectChat();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: state.architectureMessages.slice(-16),
        card: cardValues(),
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
      await maybeRenderArchitectureFromReply(
        `${final.reply || ""}\n${JSON.stringify(final)}`,
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
      await maybeRenderArchitectureFromReply(
        `${data.reply || ""}\n${JSON.stringify(data.architectureIr || data)}`,
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
  try {
    const res = await fetch("/api/architecture/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ir }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "render failed");
    state.architecture.ir = data.ir || ir;
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
  if (state.mode !== "architecture") return;
  const ir = extractArchitectureIr(reply);
  if (!ir) return;
  await renderArchitectureFromIr(ir);
}

function confirmArchitecture() {
  if (!state.architecture.url || !state.architecture.ir) return;
  state.architecture.confirmed = true;
  state.architecture.status = "confirmed";
  const revisePending = Boolean(
    (el.revGoal?.value || "").trim() || (el.revAccept?.value || "").trim(),
  );
  state.mode = revisePending && !state.reviseLocked ? "revise" : "specify";
  syncArchitecturePanel();
  syncChatPlaceholder();
  schedulePersistProjectDesk();
  addBubble("bot", t("arch.hintConfirmed"));
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
        body: JSON.stringify({ ...v, issues }),
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
        rawAsk: state.rawAsk || v.goal,
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

async function showDispatchPanel() {
  el.dispatch.hidden = false;
  el.dispatchErr.hidden = true;
  el.dispatchStatus.hidden = true;
  state.dispatchPhase = null;
  el.doDispatch.disabled = false;
  if (state.projectPath && el.repoPath) {
    el.repoPath.value = state.projectPath;
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

function renderDeployTargetList() {
  if (!el.deployTargetList) return;
  el.deployTargetList.replaceChildren();
  for (const id of DEPLOY_TARGET_IDS) {
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
        ok: ok.join(getLocale() === "en" ? ", " : "、"),
        miss: miss.join(getLocale() === "en" ? ", " : "、"),
      });
    } else if (miss.length) {
      el.agentHint.textContent = t("agent.missingHint", {
        list: miss.join(getLocale() === "en" ? ", " : "、"),
      });
    } else {
      el.agentHint.textContent = t("agent.detected");
    }
  }
  syncInstallHint();
  syncStartCommandField();
}

function syncDispatchButton() {
  if (!el.doDispatch) return;
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
  if (["goal", "outOfScope", "acceptance", "assumptions"].includes(taId)) {
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
  const mode = view.dataset.editMode || "ul";
  ta.value = serializeReqEdit(mode, readReqEditorItems(view));
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

el.saveProjectsRoot?.addEventListener("click", async () => {
  if (el.historyErr) el.historyErr.hidden = true;
  if (el.dispatchErr) el.dispatchErr.hidden = true;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectsRoot: (el.projectsRoot?.value || "").trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("dispatch.projectsRootFail"));
    if (el.projectsRoot) el.projectsRoot.value = data.projectsRoot || "";
    state.lastCfg = { ...(state.lastCfg || {}), ...data };
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = t("dispatch.projectsRootSaved");
    } else if (el.dispatchStatus) {
      el.dispatchStatus.hidden = false;
      el.dispatchStatus.textContent = t("dispatch.projectsRootSaved");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent = msg;
    } else if (el.dispatchErr) {
      el.dispatchErr.hidden = false;
      el.dispatchErr.textContent = msg;
    }
  }
});

el.repoFilter?.addEventListener("input", () => renderRepoList());

el.doDispatch.addEventListener("click", async () => {
  if (!state.jobId || state.busy) return;
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
  ensureStartCommandPrefix();
  const startCommand = el.startCommand?.value?.trim() || "";
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
        jobId: state.jobId,
        repoPath,
        agentId: state.agentId || "cursor-agent",
        startCommand,
        deployTarget: state.deployTarget || "none",
        architectureSummary: state.architecture.summary || "",
        architectureUrl: state.architecture.url || "",
        architectureIr: state.architecture.ir || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("err.dispatch"));
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
    void persistProjectChat();
    startStatusPoll();
    focusRightPanel({ force: true });
  } catch (err) {
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
  const tasks = document.createElement("ul");
  tasks.className = "progress-tasks";
  const log = document.createElement("pre");
  log.className = "progress-log";
  log.hidden = true;
  panel.appendChild(meter);
  panel.appendChild(summary);
  panel.appendChild(activity);
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
    meter,
    meterFill,
    summary,
    activity,
    tasks,
    log,
    noteEl,
  };
  return state.activeRun;
}

function fillRunProgress(block, data) {
  if (!block) return;
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
    if (block.tasks) block.tasks.replaceChildren();
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
    block.summary.textContent = `${done}/${total} · ${progress.current || ""}`;
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
  if (block.tasks) {
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
      text.textContent = task.text;
      li.appendChild(mark);
      li.appendChild(text);
      block.tasks.appendChild(li);
    }
  }
  if (block.log) {
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
  const progress = data?.progress;
  if (!progress) {
    if (!state.activeRun) el.runTimeline.hidden = el.runTimeline.childElementCount === 0;
    return;
  }
  const rev = Number(data.revision || 0);
  const block = beginRunBlock({ revision: rev });
  fillRunProgress(block, data);
  focusRightPanel();
}

function renderPreview(data) {
  if (!el.previewPanel || !el.previewLink) return;
  state.lastStatus = data?.status || state.lastStatus;
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
  const openUrl = preview?.url || latest?.url || "";
  if (!openUrl || !productReady) {
    el.previewPanel.hidden = true;
  } else {
    el.previewPanel.hidden = false;
    el.previewLink.href = openUrl;
    el.previewLink.textContent =
      preview?.label || latest?.label || t("preview.view");
    if (el.previewMeta) {
      const bits = [];
      if (preview?.path || latest?.path)
        bits.push(preview?.path || latest?.path);
      if (preview?.source)
        bits.push(
          preview.source === "auto" ? t("preview.auto") : "delivery.preview",
        );
      if (data?.revision > 0) bits.push(`r${data.revision}`);
      else if (latest && Number(latest.revision) > 0)
        bits.push(`r${latest.revision}`);
      el.previewMeta.textContent = bits.join(" · ");
    }
  }
  renderPreviewVersions(versions, openUrl);
  renderRevisePanel(data);
  if (!el.previewPanel.hidden) focusRightPanel();
}

function renderPreviewVersions(versions, activeUrl) {
  if (!el.previewVersions) return;
  el.previewVersions.replaceChildren();
  if (!Array.isArray(versions) || versions.length === 0) {
    el.previewVersions.hidden = true;
    return;
  }
  el.previewVersions.hidden = false;
  const title = document.createElement("li");
  title.className = "preview-versions-label";
  title.textContent = t("preview.versions");
  el.previewVersions.appendChild(title);
  for (const entry of versions) {
    if (!entry?.url) continue;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = entry.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "preview-version-link";
    if (entry.url === activeUrl) a.classList.add("is-current");
    const rev = Number(entry.revision) || 0;
    a.textContent =
      entry.label ||
      (rev > 0
        ? t("preview.versionRev", { revision: rev })
        : t("preview.versionInitial"));
    li.appendChild(a);
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
  if (show) focusRightPanel();
}

function enterReviseMode() {
  if (!state.jobId) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("err.noJob");
    }
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;

  // Already revising: just focus chat, do not wipe progress
  if (state.mode === "revise") {
    el.input.focus();
    focusRightPanel({ force: true });
    addBubble("bot", t("bot.continueRevise"));
    return;
  }

  if (!state.originalCard) {
    const cur = cardValues();
    if (cur.goal || cur.acceptance) state.originalCard = { ...cur };
  }

  state.mode = "revise";
  state.reviseLocked = false;
  state.reviseDispatching = false;
  state.reviseMessages = [];
  resetArchitecture({ stale: true });
  resetValidateGate();
  // Keep top confirm card as original requirements — do not clear it
  restoreConfirmCardFromOriginal();
  if (el.revGoal) el.revGoal.value = "";
  if (el.revOut) el.revOut.value = "";
  if (el.revAccept) el.revAccept.value = "";
  if (el.revAssume) el.revAssume.value = "";
  setReviseFieldsReadonly(false);
  syncReqSections();
  applyCardChrome();
  syncChatPlaceholder();
  syncConfirmEnabled();
  el.input.focus();
  addBubble("bot", t("bot.enterRevise"));
  renderRevisePanel({
    canRevise: true,
    status: "accepted",
    delivery: { status: "accepted" },
  });
  focusRightPanel({ force: true });
  void kickoffReviseDialogue();
}

async function kickoffReviseDialogue() {
  if (state.busy || state.reviseDispatching || state.mode !== "revise") return;
  setBusy(true);
  syncReviseDispatchButton(false);
  const streamBubble = startStreamingBubble();
  const kick =
    "（系统）用户已点继续改进并看过成品。请只问一个最关键问题：哪里不满意、为什么。先说话，再 <<<JSON>>> 更新改进卡（可先空着）。不要派工。";
  try {
    state.reviseMessages.push({ role: "user", content: kick });
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: state.reviseMessages.slice(-16),
        card: reviseCardValues(),
        mode: "revise",
        stream: true,
      }),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok && !ctype.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || t("err.reviseKickoff"));
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
      applyCard(final);
      if (final.reply) streamBubble.set(final.reply);
      streamBubble.finish(final.options);
      state.reviseMessages.push({ role: "assistant", content: final.reply });
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("err.chat"));
      applyCard(data);
      streamBubble.set(data.reply || "");
      streamBubble.finish(data.options);
      state.reviseMessages.push({ role: "assistant", content: data.reply });
    }
  } catch (err) {
    state.reviseMessages.pop();
    streamBubble.set(
      t("bot.reviseKickoffFail", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
    streamBubble.finish();
  } finally {
    setBusy(false);
    syncConfirmEnabled();
    el.input.focus();
  }
}

/** After revise dispatch: keep bottom 改进卡 visible with confirmed values (locked). */
function lockReviseCard(data, card) {
  state.mode = "specify"; // leave dialogue; chrome via reviseLocked
  state.reviseLocked = true;
  state.reviseDispatching = false;
  state.lastRevision = {
    revision: data.revision,
    change: card.goal,
    keep: card.outOfScope,
    acceptance: card.acceptance,
    reason: card.assumptions,
  };
  if (el.revGoal) el.revGoal.value = card.goal;
  if (el.revOut) el.revOut.value = card.outOfScope;
  if (el.revAccept) el.revAccept.value = card.acceptance;
  if (el.revAssume) el.revAssume.value = card.assumptions;
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
  applyCardChrome();
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
  if (!state.architecture.confirmed) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = t("arch.needConfirm");
    }
    beginArchitectureDesign({ kickoff: true });
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;
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
    // Keep card unlocked so Confirm revise stays available.
    state.reviseLocked = false;
    setReviseFieldsReadonly(false);
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
  if (state.statusTimer) clearInterval(state.statusTimer);
  let acceptedNotified = false;
  let lastRevision = -1;
  const tick = async () => {
    if (!state.jobId) return;
    try {
      const res = await fetch(`/api/status?jobId=${encodeURIComponent(state.jobId)}`);
      const data = await res.json();
      if (!res.ok) return;
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
      renderRevisePanel(data);
      if (data.status === "accepted" && data.delivery?.status === "accepted") {
        el.dispatchStatus.textContent = t("status.acceptedRevise", { rev });
        if (!acceptedNotified || data.revision !== lastRevision) {
          acceptedNotified = true;
          lastRevision = data.revision || 0;
          const link = data.preview?.url
            ? t("preview.link", { url: data.preview.url })
            : t("preview.missing");
          addBubble("bot", `${t("bot.accepted")}${link}`);
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
  el.startReviseChat.addEventListener("click", () => {
    enterReviseMode();
  });
}

if (el.startReviseChatAlt) {
  el.startReviseChatAlt.addEventListener("click", () => {
    enterReviseMode();
  });
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
    return d.toLocaleString(getLocale() === "en" ? "en-US" : "zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "history-item project-item";
    btn.dataset.path = proj.path;
    const pressed = normalizePathKey(proj.path) === active;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    const goal = document.createElement("span");
    goal.className = "history-item-goal";
    goal.textContent = proj.title || proj.name || proj.path;
    const st = document.createElement("span");
    st.className = "history-item-status";
    st.textContent = t("project.jobCount", {
      n: String((proj.jobs || []).length),
    });
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
    el.projectList.appendChild(btn);
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
    addBubble("bot", t("project.needName"));
    return;
  }
  const requireMeta = meta.requireMeta !== false;
  const title = String(meta.title ?? "").trim();
  const description = String(meta.description ?? "").trim();
  if (requireMeta) {
    if (!title) {
      addBubble("bot", t("project.needTitle"));
      return;
    }
    if (!description) {
      addBubble("bot", t("project.needDesc"));
      return;
    }
  }
  try {
    // Save outgoing project chat before switching.
    if (state.projectPath) await persistProjectChat();
    const body = { path: raw };
    if (requireMeta || title) body.title = title;
    if (requireMeta || description) body.description = description;
    if (requireMeta) body.requireMeta = true;
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

if (el.historyToggle) {
  el.historyToggle.addEventListener("click", () => {
    const open = el.historyPanel?.hidden !== false;
    setHistoryOpen(open);
  });
}
if (el.historyClose) {
  el.historyClose.addEventListener("click", () => setHistoryOpen(false));
}
if (el.historyBackdrop) {
  el.historyBackdrop.addEventListener("click", () => {
    if (el.settingsPanel && !el.settingsPanel.hidden) {
      if (state.ready) setSettingsOpen(false);
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
        addBubble("bot", t("project.needTitle") + " / " + t("project.needDesc"));
        return;
      }
      await activateProjectPath(data.path, {
        title,
        description,
        requireMeta: true,
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
  if (el.historyPanel && !el.historyPanel.hidden) void loadHistoryList();
});

const initialLocale = initI18n();
if (el.langSelect) {
  el.langSelect.value = initialLocale;
  el.langSelect.addEventListener("change", () => {
    setLocale(el.langSelect.value);
  });
}
applyDomI18n();
syncChatPlaceholder();
wireReqSections();
syncComposerEnabled();

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
