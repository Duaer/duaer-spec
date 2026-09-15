/**
 * 现场开发 — client dialogue protocol (no LLM required).
 * Priority: goal → who/where → acceptance → out of scope → assumptions.
 */

const QUESTIONS = [
  {
    id: "goal",
    field: "goal",
    ask: "用一句话说：做成之后，用户能得到什么？",
    why: "没有目标就无法验收。",
    options: [
      "网页上能确认需求并开工",
      "修好某个明确的线上故障",
      "加一个用户能看见的功能",
    ],
  },
  {
    id: "who",
    field: "goal",
    append: true,
    ask: "这是给谁用、在什么场景用？",
    why: "场景不同，范围差很多。",
    options: ["内部同事", "外部客户", "我自己先用"],
  },
  {
    id: "acceptance",
    field: "acceptance",
    ask: "怎样算做完？请给 1～3 条可检查的结果。",
    why: "验收含糊时数字员工会做错边界。",
    options: [
      "页面能对话、确认后写出 Brief",
      "点确认前绝不改代码",
      "本地打开即可试用",
    ],
  },
  {
    id: "out",
    field: "outOfScope",
    ask: "明确不做哪些？",
    why: "边界写清，避免范围膨胀。",
    options: ["不做云端多租户", "不做完整 IDE", "不自动推生产"],
  },
  {
    id: "assumptions",
    field: "assumptions",
    ask: "还有默认假设要记下吗？（可跳过）",
    why: "未问清的默认要标出来。",
    options: ["先用结构化提问，不接大模型", "确认后只写 Brief，人工/代理再开发", "跳过"],
  },
];

const state = {
  rawAsk: "",
  round: 0,
  asked: 0,
  phase: "seed", // seed | ask | ready
  locked: false,
};

const el = {
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
  const ok = Boolean(v.goal && v.acceptance) && !state.locked;
  el.confirm.disabled = !ok;
  el.lockHint.textContent = state.locked
    ? "已锁定。下面是给数字员工的开工说明。"
    : ok
      ? "可以确认了。确认后才会写入 Brief。"
      : "至少填好「要做什么」和「验收标准」。";
}

["goal", "outOfScope", "acceptance", "assumptions"].forEach((id) => {
  el[id].addEventListener("input", syncConfirmEnabled);
});

function addBubble(role, text, { why, options } = {}) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.appendChild(document.createTextNode(text));
  if (why) {
    const w = document.createElement("span");
    w.className = "why";
    w.textContent = why;
    div.appendChild(w);
  }
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

function applyAnswer(q, answer) {
  if (!q) return;
  const field = el[q.field];
  if (!field) return;
  if (q.append && field.value.trim()) {
    field.value = `${field.value.trim()}\n面向：${answer}`;
  } else if (q.id === "assumptions" && answer === "跳过") {
    if (!field.value.trim()) field.value = "无额外假设";
  } else if (q.id === "acceptance" && field.value.trim()) {
    field.value = `${field.value.trim()}\n- ${answer}`;
  } else if (q.id === "out" && field.value.trim()) {
    field.value = `${field.value.trim()}\n- ${answer}`;
  } else {
    field.value = answer;
  }
  syncConfirmEnabled();
}

function restate() {
  const v = cardValues();
  return [
    "目前我理解是：",
    v.goal ? `· 要做什么：${v.goal}` : "· 要做什么：待确认",
    v.outOfScope ? `· 不做什么：${v.outOfScope}` : "· 不做什么：待确认",
    v.acceptance ? `· 验收：${v.acceptance}` : "· 验收：待确认",
    v.assumptions ? `· 假设：${v.assumptions}` : "· 假设：待确认",
  ].join("\n");
}

function nextQuestion() {
  if (state.asked >= 5) {
    finishQuestions();
    return;
  }
  const q = QUESTIONS[state.round];
  if (!q) {
    finishQuestions();
    return;
  }
  state.phase = "ask";
  addBubble("bot", `${restate()}\n\n${q.ask}`, {
    why: q.why,
    options: q.options,
  });
}

function finishQuestions() {
  state.phase = "ready";
  const v = cardValues();
  if (!v.outOfScope) el.outOfScope.value = "- 第一版不做云端多租户与完整 IDE";
  if (!v.assumptions) el.assumptions.value = "- 确认后先写 Brief，由数字员工按 Duaer 开工";
  if (!v.acceptance) {
    el.acceptance.value =
      "- 能在网页完成对话与确认\n- 确认后生成 .duaer/specs Brief";
  }
  syncConfirmEnabled();
  addBubble(
    "bot",
    `${restate()}\n\n四块已整理。请在右侧改到满意，再点「需求无误，开始干活」。`,
  );
}

function onUserText(text) {
  const t = text.trim();
  if (!t || state.locked) return;
  addBubble("user", t);

  if (state.phase === "seed") {
    state.rawAsk = t;
    el.goal.value = t.slice(0, 120);
    state.phase = "ask";
    state.round = 0;
    state.asked = 0;
    addBubble("bot", `收到。先把它收成可确认的需求。\n\n${restate()}`);
    nextQuestion();
    syncConfirmEnabled();
    return;
  }

  if (state.phase === "ask") {
    const q = QUESTIONS[state.round];
    applyAnswer(q, t);
    state.round += 1;
    state.asked += 1;
    if (state.asked >= 5 || state.round >= QUESTIONS.length) {
      finishQuestions();
    } else {
      nextQuestion();
    }
    return;
  }

  // ready: free edits via chat still update goal as note
  addBubble(
    "bot",
    "右侧确认卡可直接改。改完点「需求无误，开始干活」。若要重来，刷新页面。",
  );
}

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = el.input.value;
  el.input.value = "";
  onUserText(text);
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
    el.result.textContent = `Brief: ${data.featureDir}\n分支建议: ${data.branch}\n\n—— 复制给数字员工 ——\n${data.agentPrompt}`;
    addBubble(
      "bot",
      `已锁定并写入 ${data.featureDir}。把下方开工说明交给数字员工即可。`,
    );
    syncConfirmEnabled();
  } catch (err) {
    el.confirm.disabled = false;
    el.confirm.textContent = "需求无误，开始干活";
    addBubble("bot", `写入失败：${err instanceof Error ? err.message : err}`);
  }
});

addBubble(
  "bot",
  "你好。我是现场开发。\n先用一句话描述你想做的事；我会多轮问清，再请你确认右侧四块。",
);
syncConfirmEnabled();
