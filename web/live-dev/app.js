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
    ? "已锁定。Brief 在 ~/.duaer/live/jobs，不在业务仓库里。"
    : ok
      ? "可以确认了。确认后写入隔离工作区。"
      : "至少填好「要做什么」和「验收标准」。";
}

["goal", "outOfScope", "acceptance", "assumptions"].forEach((id) => {
  el[id].addEventListener("input", syncConfirmEnabled);
});

function addBubble(role, text, { options } = {}) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.appendChild(document.createTextNode(text));
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

async function sendChat(userText) {
  state.messages.push({ role: "user", content: userText });
  addBubble("user", userText);
  if (!state.rawAsk) state.rawAsk = userText;

  state.busy = true;
  el.send.disabled = true;
  try {
    const history = state.messages.slice(-16);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: history,
        card: cardValues(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "对话失败");
    applyCard(data);
    state.messages.push({ role: "assistant", content: data.reply });
    addBubble("bot", data.reply, { options: data.options });
    if (data.ready) {
      addBubble("bot", "右侧确认卡可再改。满意后点「需求无误，开始干活」。");
    }
  } catch (err) {
    state.messages.pop();
    addBubble("bot", `出错：${err instanceof Error ? err.message : err}`);
  } finally {
    state.busy = false;
    el.send.disabled = false;
  }
}

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
  if (!v.goal || !v.acceptance || state.locked) return;
  el.confirm.disabled = true;
  el.confirm.textContent = "写入 Brief…";
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
    if (!res.ok) throw new Error(data.error || "confirm failed");
    state.locked = true;
    el.confirm.textContent = "已确认";
    el.result.hidden = false;
    el.result.textContent = `Brief: ${data.relativeDir || data.featureDir}\n分支建议: ${data.branch}\n\n—— 复制给数字员工 ——\n${data.agentPrompt}`;
    addBubble(
      "bot",
      `已锁定。Brief 在隔离区 ${data.relativeDir || data.featureDir}，未写入业务仓库。`,
    );
    syncConfirmEnabled();
  } catch (err) {
    el.confirm.disabled = false;
    el.confirm.textContent = "需求无误，开始干活";
    addBubble("bot", `写入失败：${err instanceof Error ? err.message : err}`);
  }
});

void loadConfig();
