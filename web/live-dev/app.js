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
  rawAsk: "",
  messages: [],
  providers: FALLBACK_PROVIDERS,
  providerId: "deepseek",
  jobId: null,
  statusTimer: null,
  repoCatalog: { recent: [], discovered: [] },
  agents: [],
  missingAgents: [],
  agentId: "none",
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
  doDispatch: document.getElementById("doDispatch"),
  dispatchErr: document.getElementById("dispatchErr"),
  dispatchStatus: document.getElementById("dispatchStatus"),
  dispatchProgress: document.getElementById("dispatchProgress"),
  progressSummary: document.getElementById("progressSummary"),
  progressTasks: document.getElementById("progressTasks"),
  progressLog: document.getElementById("progressLog"),
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
  const ok = Boolean(v.goal && v.acceptance) && !state.locked && state.ready;
  el.confirm.disabled = !ok;
  el.lockHint.textContent = state.locked
    ? "已确认。选择产品仓库派工，Brief 才会进入业务仓 worktree。"
    : ok
      ? "可以确认了。确认后自动验收，再派工。"
      : "至少填好「要做什么」和「验收标准」。";
}

["goal", "outOfScope", "acceptance", "assumptions"].forEach((id) => {
  el[id].addEventListener("input", syncConfirmEnabled);
});

function addBubble(role, text, { options } = {}) {
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
  state.messages.push({ role: "user", content: userText });
  addBubble("user", userText);
  if (!state.rawAsk) state.rawAsk = userText;

  state.busy = true;
  el.send.disabled = true;
  const streamBubble = startStreamingBubble();
  try {
    const history = state.messages.slice(-16);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: history,
        card: cardValues(),
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
      state.messages.push({ role: "assistant", content: final.reply });
      if (final.ready) {
        addBubble("bot", "右侧确认卡可再改。满意后点「需求无误，开始干活」。");
      }
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "对话失败");
      applyCard(data);
      streamBubble.set(data.reply || "");
      streamBubble.finish(data.options);
      state.messages.push({ role: "assistant", content: data.reply });
      if (data.ready) {
        addBubble("bot", "右侧确认卡可再改。满意后点「需求无误，开始干活」。");
      }
    }
  } catch (err) {
    state.messages.pop();
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
  if (!state.ready || state.locked || state.busy) return;
  const text = el.input.value.trim();
  if (!text) return;
  el.input.value = "";
  void sendChat(text);
});

el.confirm.addEventListener("click", async () => {
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
      const issues = Array.isArray(data.issues) ? data.issues : [];
      const detail = issues.length ? `\n- ${issues.join("\n- ")}` : "";
      addBubble(
        "bot",
        `自动验收未通过：${data.summary || data.error || "请修改确认卡"}${detail}`,
      );
      el.confirm.disabled = false;
      el.confirm.textContent = "需求无误，开始干活";
      syncConfirmEnabled();
      return;
    }
    if (!res.ok) throw new Error(data.error || "confirm failed");
    state.locked = true;
    state.jobId = data.jobId || null;
    el.confirm.textContent = "已确认";
    el.result.hidden = false;
    const reviewLine = data.review?.summary
      ? `自动验收：${data.review.summary}\n`
      : "";
    el.result.textContent = `${reviewLine}Live Brief: ${data.relativeDir || data.featureDir}\n分支建议: ${data.branch}\n\n下一步：下方选择产品仓库派工。`;
    addBubble(
      "bot",
      `自动验收通过。隔离区 Brief 已就绪；请选择产品仓库派工（建 worktree + 写入 Brief）。`,
    );
    syncConfirmEnabled();
    await showDispatchPanel();
  } catch (err) {
    el.confirm.disabled = false;
    el.confirm.textContent = "需求无误，开始干活";
    addBubble("bot", `确认失败：${err instanceof Error ? err.message : err}`);
  } finally {
    state.busy = false;
  }
});

async function showDispatchPanel() {
  el.dispatch.hidden = false;
  el.dispatchErr.hidden = true;
  el.dispatchStatus.hidden = true;
  el.doDispatch.disabled = false;
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
    const workers = state.agents.filter((a) => a.kind === "worker");
    if (preferred && state.agents.some((a) => a.id === preferred)) {
      state.agentId = preferred;
    } else if (workers.length) {
      state.agentId = workers[0].id;
    } else {
      state.agentId = "none";
    }
    renderAgentList();
    syncDispatchButton();
  } catch (err) {
    state.agents = [{ id: "none", label: "仅派工不启动", kind: "none", hint: "" }];
    state.agentId = "none";
    renderAgentList();
    if (el.agentHint) {
      el.agentHint.textContent =
        err instanceof Error ? err.message : "无法检测本机启动器";
    }
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
    if (a.hint) {
      const span = document.createElement("span");
      span.textContent = a.hint;
      b.appendChild(span);
    }
    b.addEventListener("click", () => {
      state.agentId = a.id;
      renderAgentList();
      syncDispatchButton();
    });
    el.agentList.appendChild(b);
  }
  if (el.agentHint) {
    const miss = (state.missingAgents || [])
      .map((m) => m.label)
      .filter(Boolean);
    el.agentHint.textContent = miss.length
      ? `未检测到：${miss.join("、")}（安装 CLI 并加入 PATH 后刷新）`
      : "已检测本机可用启动器";
  }
}

function syncDispatchButton() {
  if (!el.doDispatch) return;
  const label = el.doDispatch.textContent;
  if (label === "已派工" || label === "派工中…") return;
  const a = state.agents.find((x) => x.id === state.agentId);
  if (!a || a.id === "none") {
    el.doDispatch.textContent = "写入 Brief 并建 worktree";
  } else if (a.kind === "open") {
    el.doDispatch.textContent = `派工并用 ${a.label.replace(/（.*）/, "")} 打开`;
  } else {
    el.doDispatch.textContent = `派工并用 ${a.label} 启动`;
  }
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
  el.dispatchErr.hidden = true;
  el.doDispatch.disabled = true;
  el.doDispatch.textContent = "派工中…";
  state.busy = true;
  try {
    const res = await fetch("/api/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: state.jobId,
        repoPath,
        agentId: state.agentId || "none",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "派工失败");
    const launch = data.launch || {};
    const launchLine =
      launch.agentId && launch.agentId !== "none"
        ? `启动: ${launch.label || launch.agentId}${launch.pid ? ` (pid ${launch.pid})` : ""}${
            launch.logPath ? `\n日志: ${launch.logPath}` : ""
          }`
        : "启动: 未启动（仅派工）";
    el.result.hidden = false;
    el.result.textContent = `派工完成\n仓库: ${data.repoPath}\nWorktree: ${data.worktreePath}\nBrief: ${data.featureDir}\n${launchLine}\n\n—— 开工说明（备用） ——\n${data.agentPrompt}`;
    const who =
      launch.mode === "background"
        ? `已后台自动开工（${launch.label || launch.agentId}，pid ${launch.pid || "?"}）——无需再在 Cursor/终端里输入`
        : launch.agentId && launch.agentId !== "none"
          ? `已用 ${launch.label || launch.agentId} 处理`
          : "已派工；选 Cursor Agent / Claude 才会自动开工";
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
    el.dispatchErr.textContent =
      err instanceof Error ? err.message : String(err);
  } finally {
    state.busy = false;
  }
});

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

function startStatusPoll() {
  if (state.statusTimer) clearInterval(state.statusTimer);
  let acceptedNotified = false;
  const tick = async () => {
    if (!state.jobId) return;
    try {
      const res = await fetch(`/api/status?jobId=${encodeURIComponent(state.jobId)}`);
      const data = await res.json();
      if (!res.ok) return;
      renderProgress(data);
      const st = data.delivery?.status || data.status || "pending";
      const pct =
        data.progress && data.progress.total
          ? `${data.progress.done}/${data.progress.total}`
          : "";
      el.dispatchStatus.textContent = `状态：${st}${pct ? ` · ${pct}` : ""}${
        data.dispatch?.worktreeExists === false ? " · worktree 已移除" : ""
      }`;
      if (data.status === "accepted") {
        el.dispatchStatus.textContent = "delivery accepted · 工单完成";
        if (!acceptedNotified) {
          acceptedNotified = true;
          addBubble("bot", "数字员工已验收通过（delivery.json accepted）。");
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

void loadConfig();
