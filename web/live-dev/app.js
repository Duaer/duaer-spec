/**
 * Live desk UI — model-backed dialogue; Briefs go to ~/.duaer/live/jobs.
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
  confirm: document.getElementById("confirm"),
  result: document.getElementById("result"),
  lockHint: document.getElementById("lockHint"),
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
  agentInstallCmd: document.getElementById("agentInstallCmd"),
  copyInstallCmd: document.getElementById("copyInstallCmd"),
  startCommand: document.getElementById("startCommand"),
  startCmdField: document.getElementById("startCmdField"),
  doDispatch: document.getElementById("doDispatch"),
  dispatchErr: document.getElementById("dispatchErr"),
  dispatchStatus: document.getElementById("dispatchStatus"),
  dispatchProgress: document.getElementById("dispatchProgress"),
  progressSummary: document.getElementById("progressSummary"),
  progressTasks: document.getElementById("progressTasks"),
  progressLog: document.getElementById("progressLog"),
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
  cardMark: document.getElementById("cardMark"),
  cardTitle: document.getElementById("cardTitle"),
  lblGoal: document.getElementById("lblGoal"),
  lblOut: document.getElementById("lblOut"),
  lblAccept: document.getElementById("lblAccept"),
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

/** Pick the right-column section the user should see for the current stage. */
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
  if (el.dispatchProgress && !el.dispatchProgress.hidden) {
    return el.dispatchProgress;
  }
  if (el.dispatch && !el.dispatch.hidden) {
    return el.dispatch;
  }
  return el.confirm || el.cardPanel;
}

let rightFocusTimer = 0;

/** Scroll the right panel so the active stage stays in view with left chat. */
function focusRightPanel({ smooth = true, force = false } = {}) {
  const panel = el.cardPanel;
  const target = activeRightFocusEl();
  if (!panel || !target || panel.hidden) return;

  const run = () => {
    if (!el.cardPanel || !target.isConnected) return;
    // Prefer scrolling inside the right panel; fall back to nearest for mobile.
    try {
      const panelRect = panel.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const pad = 16;
      const above = targetRect.top < panelRect.top + pad;
      const below = targetRect.bottom > panelRect.bottom - pad;
      if (!force && !above && !below) return;
      const nextTop =
        panel.scrollTop + (targetRect.top - panelRect.top) - pad;
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
  syncConfirmEnabled();
  if (el.agentList && !el.dispatch?.hidden) renderAgentList();
  if (el.repoList && !el.dispatch?.hidden) renderRepoList();
  if (el.doDispatch && !el.dispatch?.hidden) syncDispatchButton();
  if (el.copyInstallCmd && el.agentInstall && !el.agentInstall.hidden) {
    el.copyInstallCmd.textContent = t("dispatch.copyInstall");
  }
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
}

function setReviseFieldsReadonly(ro) {
  for (const id of ["revGoal", "revOut", "revAccept", "revAssume"]) {
    if (el[id]) el[id].readOnly = Boolean(ro);
  }
}

function restoreConfirmCardFromOriginal() {
  if (!state.originalCard) return;
  const c = state.originalCard;
  el.goal.value = c.goal || "";
  el.outOfScope.value = c.outOfScope || "";
  el.acceptance.value = c.acceptance || "";
  el.assumptions.value = c.assumptions || "";
}

/** Top confirm card chrome never becomes 改进卡. */
function applyConfirmCardChrome() {
  if (el.cardMark) el.cardMark.textContent = t("card.mark");
  if (el.cardTitle) el.cardTitle.textContent = t("card.title");
  if (el.lblGoal) el.lblGoal.textContent = t("card.goal");
  if (el.lblOut) el.lblOut.textContent = t("card.out");
  if (el.lblAccept) el.lblAccept.textContent = t("card.accept");
  if (el.lblAssume) el.lblAssume.textContent = t("card.assume");
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
    const ok =
      state.mode === "revise" &&
      Boolean(v.goal && v.acceptance) &&
      state.ready &&
      !state.busy &&
      !state.reviseDispatching;
    syncReviseDispatchButton(ok);
    return;
  }
  const v = cardValues();
  const ok = Boolean(v.goal && v.acceptance) && !state.locked && state.ready;
  el.confirm.disabled = !ok;
  el.lockHint.textContent = state.locked
    ? t("card.lockHintLocked")
    : ok
      ? t("card.lockHintReady")
      : t("card.lockHintNeed");
  if (!state.locked) el.confirm.textContent = t("card.confirm");
  else {
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
    if (revising && !dialoguing) {
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
    const showCta = !dialoguing && accepted && !revising;
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
  el[id].addEventListener("input", syncConfirmEnabled);
});
["revGoal", "revOut", "revAccept", "revAssume"].forEach((id) => {
  if (el[id]) el[id].addEventListener("input", syncConfirmEnabled);
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

function applyCard(data) {
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
  syncConfirmEnabled();
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
    if (data.card) applyCard(data.card);
    if (res.status === 422 || data.passed === false) {
      showAcceptFailed(data);
      el.confirm.disabled = false;
      el.confirm.textContent = t("card.confirm");
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || t("err.confirm"));
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
  }
});

function showAcceptFailed(data) {
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
          onClick: (btn) => autoFixAccept(btn, issues),
        },
      ],
    },
  );
}

async function applyConfirmSuccess(data) {
  state.locked = true;
  state.jobId = data.jobId || null;
  state.originalCard = cardValues();
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

async function autoFixAccept(btn, issues) {
  if (state.busy || state.locked) return;
  const v = cardValues();
  state.busy = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = t("bot.fixing");
  }
  el.confirm.disabled = true;
  el.confirm.textContent = t("card.fixing");
  try {
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
    if (data.card) applyCard(data.card);
    if (res.status === 422 || data.passed === false) {
      const note = data.fixSummary ? `（${data.fixSummary}）` : "";
      addBubble("bot", t("bot.fixStillFailed", { note }));
      showAcceptFailed(data);
      el.confirm.disabled = false;
      el.confirm.textContent = t("card.confirm");
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || t("err.autoFix"));
    await applyConfirmSuccess(data);
  } catch (err) {
    addBubble(
      "bot",
      t("bot.autoFixFail", {
        msg: err instanceof Error ? err.message : err,
      }),
    );
    el.confirm.disabled = false;
    el.confirm.textContent = t("card.confirm");
    syncConfirmEnabled();
    if (btn) {
      btn.disabled = false;
      btn.textContent = t("bot.autoFix");
    }
  } finally {
    state.busy = false;
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
  const installFromMissing = (state.missingAgents || []).find(
    (m) => m.id === state.agentId && m.installCommand,
  );
  if (installFromMissing) {
    el.agentInstall.hidden = false;
    if (el.agentInstallCmd) {
      el.agentInstallCmd.textContent = installFromMissing.installCommand;
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
    if (a.hint) {
      const span = document.createElement("span");
      span.textContent = a.hint;
      b.appendChild(span);
    }
    b.addEventListener("click", () => {
      state.agentId = a.id;
      renderAgentList();
      syncDispatchButton();
      syncInstallHint();
      syncStartCommandField();
    });
    el.agentList.appendChild(b);
  }
  // Show missing as disabled-looking chips with install cue
  for (const m of state.missingAgents || []) {
    if (!m.installCommand) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "agent-chip";
    b.style.opacity = "0.55";
    b.setAttribute("aria-pressed", m.id === state.agentId ? "true" : "false");
    const strong = document.createElement("strong");
    strong.textContent = t("agent.notInstalled", { label: m.label });
    b.appendChild(strong);
    const span = document.createElement("span");
    span.textContent = t("agent.clickInstall");
    b.appendChild(span);
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
    el.agentHint.textContent = miss.length
      ? t("agent.missingHint", { list: miss.join(getLocale() === "en" ? ", " : "、") })
      : t("agent.detected");
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
    if (el.dispatchProgress) el.dispatchProgress.hidden = false;
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

el.startCommand?.addEventListener("blur", () => ensureStartCommandPrefix());

function renderProgress(data) {
  if (!el.dispatchProgress) return;
  const progress = data.progress;
  if (!progress) {
    el.dispatchProgress.hidden = true;
    return;
  }
  el.dispatchProgress.hidden = false;
  if (el.progressSummary) {
    el.progressSummary.textContent = `${progress.done}/${progress.total} · ${progress.current || ""}`;
  }
  if (el.progressTasks) {
    el.progressTasks.replaceChildren();
    const nextId = progress.tasks?.find((t) => !t.done)?.id;
    for (const t of progress.tasks || []) {
      const li = document.createElement("li");
      li.dataset.done = t.done ? "true" : "false";
      if (!t.done && t.id === nextId) li.dataset.current = "true";
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = t.done ? "✓" : "·";
      const text = document.createElement("span");
      text.textContent = t.text;
      li.appendChild(mark);
      li.appendChild(text);
      el.progressTasks.appendChild(li);
    }
  }
  if (el.progressLog) {
    const lines = data.logTail || [];
    if (lines.length) {
      el.progressLog.hidden = false;
      el.progressLog.textContent = lines.join("\n");
    } else {
      el.progressLog.hidden = true;
      el.progressLog.textContent = "";
    }
  }
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
  // Keep top confirm card as original requirements — do not clear it
  restoreConfirmCardFromOriginal();
  if (el.revGoal) el.revGoal.value = "";
  if (el.revOut) el.revOut.value = "";
  if (el.revAccept) el.revAccept.value = "";
  if (el.revAssume) el.revAssume.value = "";
  setReviseFieldsReadonly(false);
  applyCardChrome();
  syncChatPlaceholder();
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
    const timer = setTimeout(() => ac.abort(), 90000);
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
      throw new Error(
        snippet
          ? `HTTP ${res.status}: ${snippet}`
          : `HTTP ${res.status} ${t("err.revise")}`,
      );
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status} ${t("err.revise")}`);
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
    const msg =
      err?.name === "AbortError"
        ? t("err.timeout")
        : err instanceof Error
          ? err.message
          : t("err.revise");
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = msg;
    }
    addBubble("bot", msg);
  } finally {
    state.reviseDispatching = false;
    syncConfirmEnabled();
  }
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
  const card = data.card || {};
  el.goal.value = card.goal || "";
  el.outOfScope.value = card.outOfScope || "";
  el.acceptance.value = card.acceptance || "";
  el.assumptions.value = card.assumptions || "";
  state.originalCard = { ...cardValues() };
  const st = data.jobStatus || data.status?.status || "";
  state.locked = Boolean(st && st !== "unknown");
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

void loadConfig();
