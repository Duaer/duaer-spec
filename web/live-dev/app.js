/**
 * 现场开发 UI — model-backed dialogue; Briefs go to ~/.duaer/live/jobs.
 */

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
  { id: "custom", label: "自定义", baseUrl: "", model: "" },
];

const state = {
  ready: false,
  locked: false,
  busy: false,
  mode: "specify", // specify | revise
  rawAsk: "",
  messages: [],
  reviseMessages: [],
  providers: FALLBACK_PROVIDERS,
  providerId: "deepseek",
  jobId: null,
  statusTimer: null,
  repoCatalog: { recent: [], discovered: [] },
  agents: [],
  missingAgents: [],
  agentId: "cursor-agent",
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
  startReviseChat: document.getElementById("startReviseChat"),
  reviseErr: document.getElementById("reviseErr"),
  cardMark: document.getElementById("cardMark"),
  cardTitle: document.getElementById("cardTitle"),
  lblGoal: document.getElementById("lblGoal"),
  lblOut: document.getElementById("lblOut"),
  lblAccept: document.getElementById("lblAccept"),
  lblAssume: document.getElementById("lblAssume"),
};

function cardValues() {
  return {
    goal: el.goal.value.trim(),
    outOfScope: el.outOfScope.value.trim(),
    acceptance: el.acceptance.value.trim(),
    assumptions: el.assumptions.value.trim(),
  };
}

function syncConfirmEnabled() {
  const v = cardValues();
  if (state.mode === "revise") {
    const ok = Boolean(v.goal && v.acceptance) && state.ready && !state.busy;
    el.confirm.disabled = !ok;
    el.lockHint.textContent =
      "左侧对话弄清原因与改动；确认后才会 --continue 续派 Terminal 任务。";
    el.confirm.textContent = "改进方案确认，再派一版";
    return;
  }
  const ok = Boolean(v.goal && v.acceptance) && !state.locked && state.ready;
  el.confirm.disabled = !ok;
  el.lockHint.textContent = state.locked
    ? "已确认。选择产品仓库派工，Brief 才会进入业务仓 worktree。"
    : ok
      ? "可以确认了。确认后自动验收，再派工。"
      : "至少填好「要做什么」和「验收标准」。";
  if (!state.locked) el.confirm.textContent = "需求无误，开始干活";
}

function applyCardChrome() {
  const revise = state.mode === "revise";
  if (el.cardMark) el.cardMark.textContent = revise ? "Revise card" : "Confirm card";
  if (el.cardTitle) el.cardTitle.textContent = revise ? "改进卡" : "确认卡";
  if (el.lblGoal) el.lblGoal.textContent = revise ? "要改什么" : "要做什么";
  if (el.lblOut) el.lblOut.textContent = revise ? "不要动什么" : "不做什么";
  if (el.lblAccept) el.lblAccept.textContent = revise ? "怎么算改好" : "验收标准";
  if (el.lblAssume) el.lblAssume.textContent = revise ? "不满意原因" : "假设";
  el.goal.placeholder = revise ? "例如：主色改浅、标题加大" : "待确认";
  el.outOfScope.placeholder = revise ? "例如：不动文案结构" : "待确认";
  el.acceptance.placeholder = revise ? "例如：手机端按钮不挤在一起" : "待确认";
  el.assumptions.placeholder = revise ? "例如：主色太沉、看不清" : "待确认";
  syncConfirmEnabled();
}

["goal", "outOfScope", "acceptance", "assumptions"].forEach((id) => {
  el[id].addEventListener("input", syncConfirmEnabled);
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
  el.log.scrollTop = el.log.scrollHeight;
  return { div, textNode };
}

function startStreamingBubble() {
  const { div, textNode } = addBubble("bot", "");
  div.classList.add("streaming");
  return {
    append(chunk) {
      textNode.textContent += chunk;
      el.log.scrollTop = el.log.scrollHeight;
    },
    set(text) {
      textNode.textContent = text;
      el.log.scrollTop = el.log.scrollHeight;
    },
    finish(options) {
      div.classList.remove("streaming");
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
      el.log.scrollTop = el.log.scrollHeight;
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
        card: cardValues(),
        mode: state.mode === "revise" ? "revise" : "specify",
        stream: true,
      }),
    });
    const ctype = res.headers.get("content-type") || "";
    if (!res.ok && !ctype.includes("text/event-stream")) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "对话失败");
    }

    if (ctype.includes("text/event-stream") && res.body) {
      let final = null;
      let streamError = null;
      await readChatStream(res, (evt) => {
        if (evt.type === "delta" && evt.text) streamBubble.append(evt.text);
        else if (evt.type === "done") final = evt;
        else if (evt.type === "error") {
          streamError = new Error(evt.error || "对话失败");
        }
      });
      if (streamError) throw streamError;
      if (!final) throw new Error("流式响应不完整");
      applyCard(final);
      if (final.reply) streamBubble.set(final.reply);
      streamBubble.finish(final.options);
      bag.push({ role: "assistant", content: final.reply });
      if (final.ready) {
        addBubble(
          "bot",
          state.mode === "revise"
            ? "右侧改进卡可再改。满意后点「改进方案确认，再派一版」。"
            : "右侧确认卡可再改。满意后点「需求无误，开始干活」。",
        );
      }
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "对话失败");
      applyCard(data);
      streamBubble.set(data.reply || "");
      streamBubble.finish(data.options);
      bag.push({ role: "assistant", content: data.reply });
      if (data.ready) {
        addBubble(
          "bot",
          state.mode === "revise"
            ? "右侧改进卡可再改。满意后点「改进方案确认，再派一版」。"
            : "右侧确认卡可再改。满意后点「需求无误，开始干活」。",
        );
      }
    }
  } catch (err) {
    bag.pop();
    streamBubble.set(`出错：${err instanceof Error ? err.message : err}`);
    streamBubble.finish();
  } finally {
    state.busy = false;
    el.send.disabled = false;
  }
}

function applyCard(data) {
  if (data.goal) el.goal.value = data.goal;
  if (data.outOfScope) el.outOfScope.value = data.outOfScope;
  if (data.acceptance) el.acceptance.value = data.acceptance;
  if (data.assumptions) el.assumptions.value = data.assumptions;
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
    btn.textContent = p.label;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => applyProvider(p.id));
    el.cfgProviders.appendChild(btn);
  }
}

function showSetup(cfg) {
  el.setup.hidden = false;
  el.desk.hidden = true;
  if (Array.isArray(cfg.providers) && cfg.providers.length) {
    state.providers = cfg.providers;
  }
  renderProviders();
  el.cfgBase.value = cfg.baseUrl || "";
  el.cfgModel.value = cfg.model || "";
  el.cfgKey.value = "";
  el.cfgKey.placeholder = cfg.hasApiKey ? "已保存（留空则不改）" : "sk-…";
  const id = cfg.provider || "deepseek";
  applyProvider(id, { fillEmptyOnly: Boolean(cfg.baseUrl || cfg.model) });
}

function showDesk(cfg) {
  el.setup.hidden = true;
  el.desk.hidden = false;
  state.ready = true;
  el.meta.textContent = `模型 ${cfg.model} · Brief → ${cfg.jobsRoot || "~/.duaer/live/jobs"}`;
  if (!state.messages.length) {
    addBubble(
      "bot",
      "模型已就绪。随便说你想做什么；我会多轮问清，右侧是确认卡。确认前不会改你的业务仓库。",
    );
  }
  syncConfirmEnabled();
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const cfg = await res.json();
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
    if (!res.ok) throw new Error(data.error || "保存失败");
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
  el.confirm.textContent = "自动验收中…";
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
      el.confirm.textContent = "需求无误，开始干活";
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || "confirm failed");
    await applyConfirmSuccess(data);
  } catch (err) {
    el.confirm.disabled = false;
    el.confirm.textContent = "需求无误，开始干活";
    addBubble("bot", `确认失败：${err instanceof Error ? err.message : err}`);
  } finally {
    state.busy = false;
  }
});

function showAcceptFailed(data) {
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const detail = issues.length ? `\n- ${issues.join("\n- ")}` : "";
  addBubble(
    "bot",
    `自动验收未通过：${data.summary || data.error || "请修改确认卡"}${detail}`,
    {
      actions: [
        {
          label: "自动修正",
          onClick: (btn) => autoFixAccept(btn, issues),
        },
      ],
    },
  );
}

async function applyConfirmSuccess(data) {
  state.locked = true;
  state.jobId = data.jobId || null;
  el.confirm.textContent = "已确认";
  el.result.hidden = false;
  const reviewLine = data.review?.summary
    ? `自动验收：${data.review.summary}\n`
    : data.fixSummary
      ? `自动修正：${data.fixSummary}\n`
      : "";
  el.result.textContent = `${reviewLine}Live Brief: ${data.relativeDir || data.featureDir}\n分支建议: ${data.branch}\n\n下一步：下方选择产品仓库派工。`;
  addBubble(
    "bot",
    data.fixed
      ? `已自动修正并验收通过。隔离区 Brief 已就绪；请选择产品仓库派工。`
      : `自动验收通过。隔离区 Brief 已就绪；请选择产品仓库派工（建 worktree + 写入 Brief）。`,
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
    btn.textContent = "修正中…";
  }
  el.confirm.disabled = true;
  el.confirm.textContent = "自动修正中…";
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
      addBubble("bot", `自动修正后仍未通过${note}，可再点自动修正或手改确认卡。`);
      showAcceptFailed(data);
      el.confirm.disabled = false;
      el.confirm.textContent = "需求无误，开始干活";
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || "自动修正失败");
    await applyConfirmSuccess(data);
  } catch (err) {
    addBubble("bot", `自动修正失败：${err instanceof Error ? err.message : err}`);
    el.confirm.disabled = false;
    el.confirm.textContent = "需求无误，开始干活";
    syncConfirmEnabled();
    if (btn) {
      btn.disabled = false;
      btn.textContent = "自动修正";
    }
  } finally {
    state.busy = false;
  }
}

async function showDispatchPanel() {
  el.dispatch.hidden = false;
  el.dispatchErr.hidden = true;
  el.dispatchStatus.hidden = true;
  el.doDispatch.disabled = false;
  if (el.startCommand && !el.startCommand.value.trim()) {
    el.startCommand.value = defaultStartCommand();
  } else {
    ensureStartCommandPrefix();
  }
  syncDispatchButton();
  state.repoCatalog = { recent: [], discovered: [] };
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
    syncDispatchButton();
  } catch (err) {
    state.agents = [];
    state.missingAgents = [];
    state.agentId = "cursor-agent";
    renderAgentList();
    if (el.agentHint) {
      el.agentHint.textContent =
        err instanceof Error ? err.message : "无法检测本机 CLI";
    }
  }
}

function defaultStartCommand() {
  const goal = el.goal?.value?.trim() || "（在此写清要做什么）";
  return `Duaer

${goal}

按 Duaer 数字员工流程开工：只做 Brief 范围；边做边勾选 tasks.md；完成后 stamp delivery.json 为 accepted（有页面时写入 preview.url，如 index.html）；不要推远程除非明确要求。
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
    strong.textContent = `${m.label} · 未安装`;
    b.appendChild(strong);
    const span = document.createElement("span");
    span.textContent = "点选查看安装命令";
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
      ? `未检测到：${miss.join("、")} — 见下方安装命令`
      : "已检测本机可用启动器";
  }
  syncInstallHint();
  syncStartCommandField();
}

function syncDispatchButton() {
  if (!el.doDispatch) return;
  const label = el.doDispatch.textContent;
  if (label === "已派工" || label === "派工中…") return;
  const missingSelected = (state.missingAgents || []).some(
    (m) => m.id === state.agentId,
  );
  if (missingSelected || !state.agents.length) {
    el.doDispatch.textContent = "请先安装 CLI";
    return;
  }
  const a = state.agents.find((x) => x.id === state.agentId);
  el.doDispatch.textContent = a
    ? `派工并用 ${a.label} 启动`
    : "写入 Brief 并启动";
}

async function loadRepoCatalog(discover) {
  el.repoScan.disabled = true;
  el.repoScan.textContent = discover ? "扫描中…" : "扫描本机";
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
    el.repoScan.textContent = "扫描本机";
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
    p.textContent = filter
      ? "无匹配仓库"
      : "点「浏览…」或「扫描本机」，也可在产品仓执行 duaer live repo add";
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
    const tag = repo.kind === "recent" ? "最近" : "发现";
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
  el.repoBrowse.textContent = "选择中…";
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
        el.dispatchErr.textContent = data.error || "请从下方列表点选具体仓库";
        return;
      }
      if (data.path) {
        el.repoPath.value = data.path;
      }
      throw new Error(data.error || "选择失败");
    }
    if (Array.isArray(data.recent)) {
      state.repoCatalog.recent = data.recent;
    }
    selectRepo(data);
    addBubble(
      "bot",
      data.bootstrapped || data.baseBranchCreated
        ? `已准备仓库 ${data.name}（${data.baseBranchCreated ? "已创建 develop 分支" : "已 git init"}）并记住`
        : `已选择并记住仓库 ${data.name}`,
    );
  } catch (err) {
    el.dispatchErr.hidden = false;
    el.dispatchErr.textContent =
      err instanceof Error ? err.message : String(err);
  } finally {
    el.repoBrowse.disabled = false;
    el.repoBrowse.textContent = "浏览…";
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
    el.dispatchErr.textContent = "先点选仓库，或浏览 / 扫描";
    return;
  }
  const missingSelected = (state.missingAgents || []).some(
    (m) => m.id === state.agentId,
  );
  if (missingSelected) {
    el.dispatchErr.hidden = false;
    const m = (state.missingAgents || []).find((x) => x.id === state.agentId);
    el.dispatchErr.textContent = m?.installCommand
      ? `请先安装：${m.installCommand}`
      : "请先安装对应 CLI";
    syncInstallHint();
    return;
  }
  ensureStartCommandPrefix();
  const startCommand = el.startCommand?.value?.trim() || "";
  el.dispatchErr.hidden = true;
  el.doDispatch.disabled = true;
  el.doDispatch.textContent = "派工中…";
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
    if (!res.ok) throw new Error(data.error || "派工失败");
    const launch = data.launch || {};
    const launchLine =
      launch.agentId
        ? `启动: ${launch.label || launch.agentId}${launch.pid ? ` (pid ${launch.pid})` : ""}${
            launch.command ? `\nCLI: ${launch.command}` : ""
          }${launch.commandFile ? `\nTerminal脚本: ${launch.commandFile}` : ""}${
            launch.logPath ? `\n日志: ${launch.logPath}` : ""
          }`
        : "启动: 未启动";
    el.result.hidden = false;
    el.result.textContent = `派工完成\n仓库: ${data.repoPath}\nWorktree: ${data.worktreePath}\nBrief: ${data.featureDir}\n${launchLine}\n\n—— 启动命令 ——\n${data.agentPrompt || startCommand}`;
    const who =
      launch.mode === "terminal"
        ? `已打开 Terminal，正在执行 CLI（${launch.command || launch.label || "agent"}）`
        : `已用 ${launch.label || launch.agentId || "CLI"} 启动`;
    addBubble(
      "bot",
      `${who}。进度看下方清单与日志；完成后 delivery 会显示在此。\n${data.worktreePath}`,
    );
    el.doDispatch.textContent = "已派工";
    el.dispatchStatus.hidden = false;
    el.dispatchStatus.textContent =
      launch.kind === "worker"
        ? "数字员工已启动 · 监听 tasks.md 进度…"
        : "等待数字员工 · 监听 tasks.md 进度…";
    if (el.dispatchProgress) el.dispatchProgress.hidden = false;
    startStatusPoll();
  } catch (err) {
    el.doDispatch.disabled = false;
    syncDispatchButton();
    el.dispatchErr.hidden = false;
    const msg =
      err?.name === "AbortError"
        ? "派工超时（60s）。请刷新重试；若 worktree 已存在需换分支名或删掉旧 worktree。"
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
    if (el.doDispatch.textContent === "派工中…") {
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
    el.copyInstallCmd.textContent = "已复制";
    setTimeout(() => {
      el.copyInstallCmd.textContent = "复制安装命令";
    }, 1500);
  } catch {
    el.copyInstallCmd.textContent = "复制失败";
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
}

function renderPreview(data) {
  if (!el.previewPanel || !el.previewLink) return;
  const preview = data?.preview;
  if (!preview?.url) {
    el.previewPanel.hidden = true;
  } else {
    el.previewPanel.hidden = false;
    el.previewLink.href = preview.url;
    el.previewLink.textContent = preview.label || "查看成品";
    if (el.previewMeta) {
      const bits = [];
      if (preview.path) bits.push(preview.path);
      if (preview.source)
        bits.push(preview.source === "auto" ? "自动发现" : "delivery.preview");
      el.previewMeta.textContent = bits.join(" · ");
    }
  }
  renderRevisePanel(data);
}

function renderRevisePanel(data) {
  if (!el.revisePanel) return;
  const show =
    Boolean(data?.canRevise) &&
    (data?.status === "accepted" ||
      data?.status === "revising" ||
      Number(data?.revision || 0) > 0 ||
      data?.delivery?.status === "accepted" ||
      state.mode === "revise");
  el.revisePanel.hidden = !show;
  if (el.startReviseChat) {
    el.startReviseChat.disabled = state.mode === "revise" && state.busy;
    el.startReviseChat.textContent =
      state.mode === "revise" ? "正在左侧对话改进…" : "继续改进（左侧对话）";
  }
}

function enterReviseMode() {
  if (!state.jobId) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = "没有可改进的工单";
    }
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;
  state.mode = "revise";
  state.reviseMessages = [];
  el.goal.value = "";
  el.outOfScope.value = "";
  el.acceptance.value = "";
  el.assumptions.value = "";
  applyCardChrome();
  el.input.placeholder = "说说哪里不满意、为什么…";
  el.input.focus();
  addBubble(
    "bot",
    "进入改进对话。先说成品哪里不满意、为什么；我会问清要改什么、不要动什么。右侧是改进卡——确认后才会用 Terminal --continue 续派任务。",
  );
  renderRevisePanel({ canRevise: true, status: "accepted" });
}

function exitReviseMode() {
  state.mode = "specify";
  applyCardChrome();
  el.input.placeholder = "想做什么…";
  el.confirm.textContent = "已确认";
  el.confirm.disabled = true;
  el.lockHint.textContent = "已派工。可继续改进或查看成品。";
}

async function confirmReviseAndDispatch() {
  if (!state.jobId || state.busy) return;
  const v = cardValues();
  if (!v.goal || !v.acceptance) {
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = "先在对话里补全「要改什么」和「怎么算改好」";
    }
    return;
  }
  if (el.reviseErr) el.reviseErr.hidden = true;
  el.confirm.disabled = true;
  el.confirm.textContent = "续派中…";
  state.busy = true;
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "继续改进失败");
    const restated = data.restated
      ? `\n改：${data.restated.change || ""}\n验：${data.restated.acceptance || ""}`
      : "";
    addBubble(
      "bot",
      `已确认改进方案并启动 Revision ${data.revision}（Terminal ${data.continueSession ? "agent/claude --continue" : "新会话"}）。${restated}\n同一 worktree；改完会再出现成品链接。`,
    );
    exitReviseMode();
    if (el.dispatchStatus) {
      el.dispatchStatus.hidden = false;
      el.dispatchStatus.textContent = `状态：revising · r${data.revision} · continue`;
    }
    startStatusPoll();
  } catch (err) {
    const msg =
      err?.name === "AbortError"
        ? "超时。请刷新重试；若 Agent 已打开可在 Terminal 里继续。"
        : err instanceof Error
          ? err.message
          : "继续改进失败";
    if (el.reviseErr) {
      el.reviseErr.hidden = false;
      el.reviseErr.textContent = msg;
    }
    addBubble("bot", msg);
    syncConfirmEnabled();
  } finally {
    state.busy = false;
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
      el.dispatchStatus.textContent = `状态：${st}${pct ? ` · ${pct}` : ""}${rev}${
        data.dispatch?.worktreeExists === false ? " · worktree 已移除" : ""
      }`;
      if (data.status === "accepted" && data.delivery?.status === "accepted") {
        el.dispatchStatus.textContent = `delivery accepted · 可继续改进${rev}`;
        if (!acceptedNotified || data.revision !== lastRevision) {
          acceptedNotified = true;
          lastRevision = data.revision || 0;
          const link = data.preview?.url
            ? `\n成品：${data.preview.url}`
            : "\n（未找到 preview / index.html，可让数字员工在 delivery.json 写入 preview.url）";
          addBubble(
            "bot",
            `数字员工已验收通过。不满意请点「继续改进（左侧对话）」说清原因后再派。${link}`,
          );
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

void loadConfig();
