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
  mode: "specify", // specify | revise
  /** After a successful revise: right card stays locked 改进卡. */
  reviseLocked: false,
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
  /** null | "working" | "done" — dispatch button phase */
  dispatchPhase: null,
  lastCfg: null,
  lastUpdate: null,
  historyJobs: [],
  selectedHistoryId: null,
  selectedHistoryDetail: null,
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
};

const el = {
  setup: document.getElementById("setup"),
  desk: document.getElementById("desk"),
  log: document.getElementById("log"),
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
  meta: document.getElementById("meta"),
  send: document.getElementById("send"),
  cfgProviders: document.getElementById("cfgProviders"),
  cfgBase: document.getElementById("cfgBase"),
  cfgKey: document.getElementById("cfgKey"),
  cfgModel: document.getElementById("cfgModel"),
  saveCfg: document.getElementById("saveCfg"),
  cfgErr: document.getElementById("cfgErr"),
  dispatch: document.getElementById("dispatch"),
  repoList: document.getElementById("repoList"),
  repoPath: document.getElementById("repoPath"),
  repoFilter: document.getElementById("repoFilter"),
  repoBrowse: document.getElementById("repoBrowse"),
  repoScan: document.getElementById("repoScan"),
  agentList: document.getElementById("agentList"),
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
      : t("chat.placeholder");
}

function syncDynamicI18n() {
  for (const p of state.providers) {
    if (p.id === "custom") p.label = t("provider.custom");
  }
  if (el.setup && !el.setup.hidden) {
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
  if (el.agentList && !el.dispatch?.hidden) renderAgentList();
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
    return;
  }
  target.hidden = false;
  if (st === "checking") {
    target.textContent = t("validate.checking");
    return;
  }
  if (st === "passed") {
    target.textContent = t("validate.passed", {
      summary: state.validate.summary || "",
    });
    return;
  }
  const issues = state.validate.issues || [];
  const detail = issues.length ? `\n- ${issues.join("\n- ")}` : "";
  target.textContent = t("validate.failed", {
    summary: state.validate.summary || t("bot.acceptFailedDefault"),
    detail,
  });
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
  }
}

function syncConfirmEnabled() {
  applyConfirmCardChrome();
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
    !ready || state.busy || state.reviseDispatching;
  if (showDispatch) {
    el.doReviseDispatch.textContent = state.reviseDispatching
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
    if (state.locked) return;
    scheduleValidate("confirm");
  });
});
["revGoal", "revOut", "revAccept", "revAssume"].forEach((id) => {
  if (el[id]) {
    el[id].addEventListener("input", () => {
      autoGrowTextarea(el[id]);
      if (state.reviseLocked) return;
      scheduleValidate("revise");
    });
  }
});

function addBubble(role, text, { options, actions } = {}) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  const textNode = document.createTextNode(text);
  div.appendChild(textNode);
  if (options?.length) {
    const row = document.createElement("div");
    row.className = "options";
    for (const opt of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = opt;
      b.addEventListener("click", () => {
        el.input.value = opt;
        el.form.requestSubmit();
      });
      row.appendChild(b);
    }
    div.appendChild(row);
  }
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
  scrollChatToLatest();
  focusRightPanel();
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
      scrollChatToLatest();
      focusRightPanel({ force: true });
      if (!options?.length) return;
      const row = document.createElement("div");
      row.className = "options";
      for (const opt of options) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = opt;
        b.addEventListener("click", () => {
          el.input.value = opt;
          el.form.requestSubmit();
        });
        row.appendChild(b);
      }
      div.appendChild(row);
      scrollChatToLatest();
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

async function sendChat(userText) {
  const bag = state.mode === "revise" ? state.reviseMessages : state.messages;
  bag.push({ role: "user", content: userText });
  addBubble("user", userText);
  if (state.mode !== "revise" && !state.rawAsk) state.rawAsk = userText;

  state.busy = true;
  el.send.disabled = true;
  const streamBubble = startStreamingBubble();
  try {
    const history = bag.slice(-16);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: history,
        card: state.mode === "revise" ? reviseCardValues() : cardValues(),
        mode: state.mode === "revise" ? "revise" : "specify",
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
      applyCard(final);
      if (final.reply) streamBubble.set(final.reply);
      streamBubble.finish(final.options);
      bag.push({ role: "assistant", content: final.reply });
      if (final.ready) {
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
      applyCard(data);
      streamBubble.set(data.reply || "");
      streamBubble.finish(data.options);
      bag.push({ role: "assistant", content: data.reply });
      if (data.ready) {
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
    state.busy = false;
    el.send.disabled = false;
    syncConfirmEnabled();
  }
}

function applyCard(data, { skipValidate = false } = {}) {
  if (state.mode === "revise") {
    if (data.goal && el.revGoal) el.revGoal.value = data.goal;
    if (data.outOfScope && el.revOut) el.revOut.value = data.outOfScope;
    if (data.acceptance && el.revAccept) el.revAccept.value = data.acceptance;
    if (data.assumptions && el.revAssume) el.revAssume.value = data.assumptions;
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

function showSetup(cfg) {
  el.setup.hidden = false;
  el.desk.hidden = true;
  state.lastCfg = { ...cfg, ready: false };
  if (Array.isArray(cfg.providers) && cfg.providers.length) {
    state.providers = cfg.providers.map((p) => ({ ...p }));
  }
  renderProviders();
  el.cfgBase.value = cfg.baseUrl || "";
  el.cfgModel.value = cfg.model || "";
  el.cfgKey.value = "";
  el.cfgKey.placeholder = cfg.hasApiKey ? t("setup.keySaved") : "sk-…";
  const id = cfg.provider || "deepseek";
  applyProvider(id, { fillEmptyOnly: Boolean(cfg.baseUrl || cfg.model) });
}

function showDesk(cfg) {
  el.setup.hidden = true;
  el.desk.hidden = false;
  state.ready = true;
  state.lastCfg = { ...cfg, ready: true };
  el.meta.textContent = t("meta.model", {
    model: cfg.model,
    jobs: cfg.jobsRoot || "~/.duaer/live/jobs",
  });
  if (!state.messages.length) {
    addBubble("bot", t("bot.ready"));
  }
  syncConfirmEnabled();
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

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const chatAllowed =
    state.ready &&
    !state.busy &&
    !state.reviseDispatching &&
    (state.mode === "revise" || !state.locked);
  if (!chatAllowed) return;
  const text = el.input.value.trim();
  if (!text) return;
  el.input.value = "";
  void sendChat(text);
});

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
  state.busy = true;
  try {
    const res = await fetch("/api/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...v,
        rawAsk: state.rawAsk || v.goal,
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
    state.busy = false;
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
  await showDispatchPanel();
}

async function autoFixAccept(btn, issues, kind = "confirm") {
  if (state.busy) return;
  if (kind === "confirm" && state.locked) return;
  if (kind === "revise" && state.reviseLocked) return;
  const v = kind === "revise" ? reviseCardValues() : cardValues();
  state.busy = true;
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
    state.busy = false;
    syncConfirmEnabled();
  }
}

async function showDispatchPanel() {
  el.dispatch.hidden = false;
  el.dispatchErr.hidden = true;
  el.dispatchStatus.hidden = true;
  state.dispatchPhase = null;
  el.doDispatch.disabled = false;
  if (el.startCommand && !el.startCommand.value.trim()) {
    el.startCommand.value = defaultStartCommand();
  } else {
    ensureStartCommandPrefix();
  }
  syncDispatchButton();
  state.repoCatalog = { recent: [], discovered: [] };
  focusRightPanel({ force: true });
  await Promise.all([loadRepoCatalog(false), loadAgents()]);
  focusRightPanel({ force: true });
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
    syncDispatchButton();
  } catch (err) {
    state.agents = [];
    state.missingAgents = [];
    state.agentId = "cursor-agent";
    renderAgentList();
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
    return;
  }
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

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function structuredHtml(text, emptyLabel) {
  const raw = String(text || "").replace(/\r\n/g, "\n");
  if (!raw.trim()) {
    return `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
  }
  const lines = raw.split("\n");
  let html = "";
  let i = 0;
  while (i < lines.length) {
    const bullet = lines[i].match(/^\s*[-*•]\s+(.*)$/);
    const numbered = lines[i].match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet) {
      html += "<ul>";
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*•]\s+(.*)$/);
        if (!m) break;
        html += `<li>${escapeHtml(m[1])}</li>`;
        i += 1;
      }
      html += "</ul>";
      continue;
    }
    if (numbered) {
      html += "<ol>";
      while (i < lines.length) {
        const m = lines[i].match(/^\s*\d+[.)]\s+(.*)$/);
        if (!m) break;
        html += `<li>${escapeHtml(m[1])}</li>`;
        i += 1;
      }
      html += "</ol>";
      continue;
    }
    if (!lines[i].trim()) {
      i += 1;
      continue;
    }
    const parts = [];
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) break;
      if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) break;
      parts.push(escapeHtml(line.trim()));
      i += 1;
    }
    html += `<p>${parts.join("<br>")}</p>`;
  }
  return html || `<p class="req-empty">${escapeHtml(emptyLabel || "…")}</p>`;
}

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
  const empty = t(pair.emptyKey) || ta.placeholder || "…";
  view.innerHTML = structuredHtml(ta.value, empty);
  if (section) {
    section.classList.toggle("is-readonly", isReqReadonly(pair.ta));
    if (!section.classList.contains("is-editing")) {
      autoGrowTextarea(ta);
    }
  }
}

function syncReqSections() {
  for (const pair of REQ_FIELD_PAIRS) syncReqSection(pair);
}

function enterReqEdit(pair) {
  const ta = el[pair.ta];
  const section = reqSectionFor(ta);
  if (!ta || !section || isReqReadonly(pair.ta)) return;
  section.classList.add("is-editing");
  autoGrowTextarea(ta);
  ta.focus();
  const len = ta.value.length;
  try {
    ta.setSelectionRange(len, len);
  } catch {
    /* ignore */
  }
}

function exitReqEdit(pair) {
  const ta = el[pair.ta];
  const section = reqSectionFor(ta);
  if (!section) return;
  section.classList.remove("is-editing");
  syncReqSection(pair);
}

function wireReqSections() {
  for (const pair of REQ_FIELD_PAIRS) {
    const ta = el[pair.ta];
    const view = el[pair.view];
    if (!ta || !view) continue;
    view.addEventListener("click", () => enterReqEdit(pair));
    view.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        enterReqEdit(pair);
      }
    });
    ta.addEventListener("blur", () => exitReqEdit(pair));
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

el.repoScan?.addEventListener("click", () => {
  void loadRepoCatalog(true);
});

el.repoFilter?.addEventListener("input", () => renderRepoList());

el.doDispatch.addEventListener("click", async () => {
  if (!state.jobId || state.busy) return;
  const repoPath = el.repoPath.value.trim();
  if (!repoPath) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent = t("err.noRepo");
    return;
  }
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
  ensureStartCommandPrefix();
  const startCommand = el.startCommand?.value?.trim() || "";
  el.dispatchErr.hidden = true;
  el.doDispatch.disabled = true;
  state.dispatchPhase = "working";
  el.doDispatch.textContent = t("dispatch.working");
  state.busy = true;
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
    state.busy = false;
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
  if (block.summary) {
    block.summary.textContent = `${progress.done}/${progress.total} · ${progress.current || ""}`;
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
  const preview = data?.preview;
  const productReady =
    state.lastDeliveryAccepted ||
    data?.status === "revising" ||
    Number(data?.revision || 0) > 0 ||
    state.mode === "revise" ||
    state.reviseLocked;
  if (!preview?.url || !productReady) {
    el.previewPanel.hidden = true;
  } else {
    el.previewPanel.hidden = false;
    el.previewLink.href = preview.url;
    el.previewLink.textContent = preview.label || t("preview.view");
    if (el.previewMeta) {
      const bits = [];
      if (preview.path) bits.push(preview.path);
      if (preview.source)
        bits.push(
          preview.source === "auto" ? t("preview.auto") : "delivery.preview",
        );
      if (data?.revision > 0) bits.push(`r${data.revision}`);
      el.previewMeta.textContent = bits.join(" · ");
    }
  }
  renderRevisePanel(data);
  if (!el.previewPanel.hidden) focusRightPanel();
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
  state.busy = true;
  el.send.disabled = true;
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
    state.busy = false;
    el.send.disabled = false;
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
  el.historyPanel.hidden = !open;
  if (el.historyBackdrop) el.historyBackdrop.hidden = !open;
  document.body.classList.toggle("history-open", Boolean(open));
  if (el.historyToggle) {
    el.historyToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (open) void loadHistoryList();
}

async function loadHistoryList() {
  if (!el.historyList) return;
  if (el.historyErr) el.historyErr.hidden = true;
  el.historyList.replaceChildren();
  if (el.historyDetail) el.historyDetail.hidden = true;
  state.selectedHistoryId = null;
  try {
    const res = await fetch("/api/jobs?limit=40");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("history.loadFail"));
    state.historyJobs = data.jobs || [];
    if (!state.historyJobs.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = t("history.empty");
      el.historyList.appendChild(p);
      return;
    }
    for (const job of state.historyJobs) {
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
  } catch (err) {
    if (el.historyErr) {
      el.historyErr.hidden = false;
      el.historyErr.textContent =
        err instanceof Error ? err.message : t("history.loadFail");
    }
  }
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
  if (data.dispatch?.repoPath || data.dispatch?.worktreePath) {
    el.dispatch.hidden = false;
    if (el.repoPath) el.repoPath.value = data.dispatch.repoPath || "";
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
  el.historyBackdrop.addEventListener("click", () => setHistoryOpen(false));
}
if (el.historyRestore) {
  el.historyRestore.addEventListener("click", () => {
    void restoreHistoryJob();
  });
}

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

void loadConfig();
