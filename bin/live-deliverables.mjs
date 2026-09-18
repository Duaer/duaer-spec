/**
 * Stage deliverables model + standalone HTML page for FDE desk.
 */

import fs from "node:fs";
import path from "node:path";
import { projectChatKey } from "./live-project-chat.mjs";
import { modulesAllConfirmed, taskPoolToMarkdown } from "./live-modules.mjs";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtAt(iso, lang) {
  if (!iso) return lang === "en" ? "—" : "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
    return d.toLocaleString(lang === "en" ? "en-US" : "zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso).slice(0, 19);
  }
}

/**
 * Split free text into list items when it looks numbered / bulleted / delimited.
 * Handles inline forms like `1) …；2) …` common in Chinese acceptance.
 */
export function splitContentItems(text, opts = {}) {
  const allowChips = opts.allowChips !== false;
  const raw = String(text || "").trim();
  if (!raw) return [];

  // Explicit newlines first
  let lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Inline numbered: 1) / 1. / 1、 / （1）
  if (lines.length === 1) {
    const one = lines[0];
    const normalized = one.replace(
      /[；;]\s*(?=\d+[\.\)、]|[（(]\d+[）)])/g,
      "\n",
    );
    const numbered = normalized
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (
      numbered.length > 1 &&
      numbered.every((p) => /^(?:\d+[\.\)、]|[（(]\d+[）)])/.test(p))
    ) {
      lines = numbered;
    } else if (/(?:→|->|=>|➜)/.test(one) && one.split(/\s*(?:→|->|=>|➜)\s*/).length > 2) {
      return one
        .split(/\s*(?:→|->|=>|➜)\s*/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => ({ kind: "step", text: p }));
    } else {
      // Semicolon clauses (acceptance without numbers)
      const semi = one
        .split(/[；;]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => p.replace(/^[-*•·]\s+/, ""));
      if (semi.length >= 2 && semi.every((p) => p.length <= 120)) {
        return semi.map((p) => ({ kind: "item", text: p }));
      }
      // Short comma / 、 list (out of scope style) — only when chips allowed
      if (allowChips) {
        const parts = one
          .split(/[、,，]/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (
          parts.length >= 3 &&
          parts.every((p) => p.length <= 40) &&
          one.length <= 280
        ) {
          return parts.map((p) => ({ kind: "chip", text: p }));
        }
      }
    }
  }

  return lines.map((l) => {
    const cleaned = l
      .replace(/^[-*•·]\s+/, "")
      .replace(/^\d+[\.\)、]\s*/, "")
      .replace(/^[（(]\d+[）)]\s*/, "")
      .trim();
    const numbered = /^(?:\d+[\.\)、]|[（(]\d+[）)]|[-*•·])/.test(l);
    return { kind: numbered || lines.length > 1 ? "item" : "para", text: cleaned || l };
  });
}

/**
 * @param {string} text
 * @param {{ as?: "auto"|"list"|"chips"|"flow"|"prose" }} [opts]
 */
export function structuredBody(text, opts = {}) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const force = opts.as || "auto";
  const items = splitContentItems(raw, {
    allowChips: force === "chips" || force === "auto",
  });
  if (!items.length) return "";

  if (force === "prose") {
    // Prose fields (goal): never chip-split on 、; only lift clear numbered lists
    const proseItems = splitContentItems(raw, { allowChips: false });
    const numbered =
      proseItems.length > 1 &&
      !proseItems.every((i) => i.kind === "step") &&
      /(?:^|\n)\s*\d+[\.\)、]/.test(raw.replace(/[；;]\s*(?=\d+)/g, "\n"));
    if (numbered) {
      return `<ol class="struct-ol">${proseItems
        .map((i) => `<li>${esc(i.text)}</li>`)
        .join("")}</ol>`;
    }
    if (proseItems.length === 1 && proseItems[0].kind !== "step") {
      return `<p class="struct-p">${esc(proseItems[0].text)}</p>`;
    }
    // Semicolon-split items under prose → keep as paragraphs, not chips
    if (
      proseItems.length > 1 &&
      proseItems.every((i) => i.kind === "item" || i.kind === "para")
    ) {
      return proseItems.map((i) => `<p class="struct-p">${esc(i.text)}</p>`).join("");
    }
    return `<p class="struct-p">${esc(raw)}</p>`;
  }
  const allChips = items.every((i) => i.kind === "chip");
  const allSteps = items.every((i) => i.kind === "step");
  const asList =
    force === "list" ||
    (force === "auto" &&
      items.length > 1 &&
      items.every((i) => i.kind === "item" || i.kind === "para") &&
      (items.some((i) => i.kind === "item") || items.length >= 2));

  if (force === "chips" || (force === "auto" && allChips)) {
    return `<ul class="chip-list">${items
      .map((i) => `<li class="chip">${esc(i.text)}</li>`)
      .join("")}</ul>`;
  }
  if (force === "flow" || (force === "auto" && allSteps)) {
    return `<ol class="flow-steps">${items
      .map((i) => `<li><span class="flow-node">${esc(i.text)}</span></li>`)
      .join("")}</ol>`;
  }
  if (asList || force === "list") {
    const numbered = /(?:^|\n)\s*(?:\d+[\.\)、]|[（(]\d+[）)])/.test(
      raw.replace(/[；;]\s*(?=\d+)/g, "\n"),
    );
    const tag = numbered ? "ol" : "ul";
    const cls = numbered ? "struct-ol" : "struct-list";
    return `<${tag} class="${cls}">${items
      .map((i) => `<li>${esc(i.text)}</li>`)
      .join("")}</${tag}>`;
  }
  if (items.length > 1) {
    return items.map((i) => `<p class="struct-p">${esc(i.text)}</p>`).join("");
  }
  return `<p class="struct-p">${esc(items[0].text)}</p>`;
}

function cardBlock(card, labels) {
  const c = card || {};
  const rows = [
    [labels.goal, c.goal, "prose"],
    [labels.out, c.outOfScope, "chips"],
    [labels.accept, c.acceptance, "list"],
    [labels.assume, c.assumptions, "list"],
  ].filter(([, v]) => String(v || "").trim());
  if (!rows.length) return `<p class="empty">${esc(labels.emptyCard)}</p>`;
  return `<dl class="card-dl">${rows
    .map(([k, v, as]) => {
      let body;
      if (as === "chips") {
        body = structuredBody(v, { as: "chips" });
        // Fallback to prose/list if chip split did not apply
        if (!body.includes("chip-list")) {
          body = structuredBody(v, { as: "list" });
        }
      } else if (as === "list") {
        body = structuredBody(v, { as: "list" });
      } else {
        body = structuredBody(v, { as: "prose" });
      }
      return `<div class="card-row"><dt>${esc(k)}</dt><dd>${body}</dd></div>`;
    })
    .join("")}</dl>`;
}

function moduleCard(m, L, { index = null, confirmed = false } = {}) {
  const idx =
    index != null
      ? `<span class="mod-index">${esc(String(index).padStart(2, "0"))}</span>`
      : "";
  const badge = confirmed
    ? `<span class="badge ok">${esc(L.confirmed)}</span>`
    : "";
  const id = m.id || m.moduleId || m.title || "mod";
  return `<section class="mod-card" id="mod-${esc(id)}">
  <header class="mod-head">${idx}<div class="mod-titles"><h5>${esc(m.title)}</h5>${badge}</div></header>
  ${cardBlock(m.card || {}, L)}
</section>`;
}

function renderTaskPoolHtml(body, L) {
  const raw = String(body || "");
  const lines = raw.split(/\r?\n/);
  const tasks = [];
  for (const line of lines) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+?)\s*$/);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    let rest = m[2].trim();
    const idMatch = rest.match(/^(T\d+|R\d+[-\w]*)\b/i);
    const id = idMatch ? idMatch[1].toUpperCase() : "";
    if (id) rest = rest.slice(idMatch[0].length).trim();
    const modMatch = rest.match(/^\[([^\]]+)\]\s*/);
    const moduleId = modMatch ? modMatch[1] : "";
    if (modMatch) rest = rest.slice(modMatch[0].length).trim();
    const depMatch = rest.match(/\s*\(depends:\s*([^)]+)\)\s*$/i);
    const depends = depMatch
      ? depMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (depMatch) rest = rest.slice(0, depMatch.index).trim();
    tasks.push({ id, moduleId, title: rest, depends, done });
  }
  if (!tasks.length) {
    return `<div class="summary">${structuredBody(raw)}</div>`;
  }
  const rows = tasks
    .map((t) => {
      const deps = t.depends.length
        ? `<span class="task-deps">${esc(L.depends)}: ${esc(t.depends.join(", "))}</span>`
        : "";
      const mod = t.moduleId
        ? `<span class="task-mod">${esc(t.moduleId)}</span>`
        : "";
      return `<tr data-done="${t.done ? "true" : "false"}">
  <td class="task-check">${t.done ? "✓" : "·"}</td>
  <td class="task-id">${esc(t.id || "—")}</td>
  <td class="task-body">${mod}<span class="task-title">${esc(t.title)}</span>${deps}</td>
</tr>`;
    })
    .join("\n");
  return `<div class="task-pool-wrap">
  <table class="task-table">
    <thead><tr><th></th><th>${esc(L.taskId)}</th><th>${esc(L.taskTitle)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

/**
 * Build structured deliverables from a project chat session (+ optional job).
 * @param {object} session
 * @param {{ job?: object|null, lang?: string, projectTitle?: string }} [opts]
 */
export function buildDeliverablesModel(session, opts = {}) {
  const lang = opts.lang === "en" ? "en" : "zh";
  const s = session && typeof session === "object" ? session : {};
  const modules = Array.isArray(s.modules) ? s.modules : [];
  const confirmed = modules.filter((m) => m.status === "confirmed");
  const allReq = modulesAllConfirmed(modules);
  const reviseCards = Array.isArray(s.reviseCards) ? s.reviseCards : [];
  const arch = s.architecture && typeof s.architecture === "object" ? s.architecture : {};
  const job = opts.job && typeof opts.job === "object" ? opts.job : null;
  const delivery = job?.status?.delivery || null;
  const preview = job?.status?.preview || delivery?.preview || null;

  const reqVersions = [];
  if (allReq || confirmed.length) {
    reqVersions.push({
      id: "v0",
      label: lang === "en" ? "Initial" : "初版",
      at: s.updatedAt || null,
      modules: (allReq ? modules : confirmed).map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        card: m.card || {},
      })),
    });
  }
  for (const entry of reviseCards) {
    const rev = Number(entry.revision) || 0;
    if (rev < 1) continue;
    reqVersions.push({
      id: `r${rev}`,
      label:
        lang === "en" ? `Revision ${rev}` : `第 ${rev} 次改进`,
      at: entry.at || s.updatedAt || null,
      revise: {
        goal: entry.goal || "",
        outOfScope: entry.outOfScope || "",
        acceptance: entry.acceptance || "",
        assumptions: entry.assumptions || "",
      },
    });
  }

  const stages = [
    {
      id: "requirements",
      title: lang === "en" ? "Requirements" : "需求",
      status: allReq ? "done" : confirmed.length ? "partial" : "empty",
      artifacts: [
        {
          id: "req-doc",
          title: lang === "en" ? "Requirements document" : "需求文档",
          kind: "timeline",
          ready: reqVersions.length > 0,
          versions: reqVersions,
        },
        {
          id: "req-confirm",
          title: lang === "en" ? "Requirements confirmation" : "需求确认书",
          kind: "confirmations",
          ready: confirmed.length > 0,
          confirmations: confirmed.map((m) => ({
            moduleId: m.id,
            title: m.title,
            status: m.status,
            card: m.card || {},
          })),
        },
      ],
    },
    {
      id: "architecture",
      title: lang === "en" ? "Architecture" : "架构",
      status: arch.confirmed ? "done" : arch.url ? "partial" : "empty",
      artifacts: [
        {
          id: "arch-diagram",
          title: lang === "en" ? "Architecture diagram" : "架构图",
          kind: "architecture",
          ready: Boolean(arch.url),
          url: arch.url || null,
          summary: arch.summary || "",
          confirmed: Boolean(arch.confirmed),
        },
        {
          id: "arch-confirm",
          title: lang === "en" ? "Architecture confirmation" : "架构确认",
          kind: "note",
          ready: Boolean(arch.confirmed),
          body: arch.confirmed
            ? lang === "en"
              ? "Architecture confirmed on the desk."
              : "已在台面确认架构。"
            : "",
        },
      ],
    },
    {
      id: "kickoff",
      title: lang === "en" ? "Kickoff & implementation" : "开工与实现",
      status: s.jobId || s.taskPool ? "done" : "empty",
      artifacts: [
        {
          id: "brief",
          title: lang === "en" ? "Brief / job" : "Brief / 工单",
          kind: "note",
          ready: Boolean(s.jobId),
          body: s.jobId
            ? `${lang === "en" ? "Job" : "工单"}: ${s.jobId}`
            : "",
        },
        {
          id: "task-pool",
          title: lang === "en" ? "Task pool" : "任务池",
          kind: "taskpool",
          ready: Boolean(s.taskPool),
          body: s.taskPool
            ? taskPoolToMarkdown(s.taskPool) || JSON.stringify(s.taskPool, null, 2)
            : "",
          meta:
            Number(s.workerCount) > 1
              ? lang === "en"
                ? `Workers: ${s.workerCount}`
                : `数字员工：${s.workerCount}`
              : "",
        },
      ],
    },
    {
      id: "delivery",
      title: lang === "en" ? "Delivery" : "交付",
      status:
        delivery?.status === "accepted" || job?.jobStatus === "accepted"
          ? "done"
          : preview?.url || delivery
            ? "partial"
            : "empty",
      artifacts: [
        {
          id: "delivery-stamp",
          title: lang === "en" ? "Delivery stamp" : "交付戳",
          kind: "note",
          ready: Boolean(delivery || job?.jobStatus),
          body: delivery
            ? `${lang === "en" ? "Status" : "状态"}: ${delivery.status || "—"}${
                delivery.acceptedAt
                  ? `\n${lang === "en" ? "Accepted" : "验收"}: ${delivery.acceptedAt}`
                  : ""
              }`
            : job?.jobStatus
              ? `${lang === "en" ? "Job status" : "工单状态"}: ${job.jobStatus}`
              : "",
        },
        {
          id: "preview",
          title: lang === "en" ? "Preview" : "预览",
          kind: "link",
          ready: Boolean(preview?.url),
          url: preview?.url || null,
        },
      ],
    },
  ];

  if (reviseCards.length || s.reviseLocked || s.lastRevision) {
    stages.push({
      id: "revise",
      title: lang === "en" ? "Revisions" : "改进",
      status: reviseCards.length ? "done" : "partial",
      artifacts: reviseCards.map((entry) => ({
        id: `revise-${entry.revision}`,
        title:
          lang === "en"
            ? `Revision ${entry.revision} plan`
            : `第 ${entry.revision} 版改进方案`,
        kind: "card",
        ready: true,
        card: {
          goal: entry.goal || "",
          outOfScope: entry.outOfScope || "",
          acceptance: entry.acceptance || "",
          assumptions: entry.assumptions || "",
        },
        at: entry.at || null,
      })),
    });
  }

  return {
    schemaVersion: 1,
    lang,
    generatedAt: new Date().toISOString(),
    projectPath: String(s.projectPath || ""),
    projectTitle:
      String(opts.projectTitle || "").trim() ||
      path.basename(String(s.projectPath || "")) ||
      (lang === "en" ? "Project" : "项目"),
    updatedAt: s.updatedAt || null,
    stages,
  };
}

function labelsFor(lang) {
  if (lang === "en") {
    return {
      brand: "Project deliverables",
      pageTitle: "Deliverables dossier",
      subtitle: "A clear record of what each stage produced",
      generated: "Generated",
      project: "Project",
      emptyStage: "No artifacts yet",
      emptyCard: "Empty",
      goal: "Goal",
      out: "Out of scope",
      accept: "Acceptance",
      assume: "Assumptions",
      statusDone: "Ready",
      statusPartial: "In progress",
      statusEmpty: "Pending",
      timeline: "Version timeline",
      toc: "Contents",
      artifacts: "Artifacts",
      openArch: "Open diagram",
      openLink: "Open",
      confirmed: "Confirmed",
      draft: "Draft",
      module: "Module",
      depends: "Depends",
      taskId: "ID",
      taskTitle: "Task",
      confirmRegistry: "Confirmation registry",
      jump: "View in requirements",
    };
  }
  return {
    brand: "项目交付物",
    pageTitle: "交付物档案",
    subtitle: "按开发阶段整理，便于客户查阅与确认",
    generated: "生成时间",
    project: "项目",
    emptyStage: "尚未产出",
    emptyCard: "（空）",
    goal: "要做什么",
    out: "不做",
    accept: "验收标准",
    assume: "假设",
    statusDone: "已产出",
    statusPartial: "进行中",
    statusEmpty: "未开始",
    timeline: "版本时间线",
    toc: "目录",
    artifacts: "交付物",
    openArch: "打开架构图",
    openLink: "打开",
    confirmed: "已确认",
    draft: "草稿",
    module: "模块",
    depends: "依赖",
    taskId: "编号",
    taskTitle: "任务",
    confirmRegistry: "确认登记",
    jump: "查看需求正文",
  };
}

function statusLabel(status, L) {
  if (status === "done") return L.statusDone;
  if (status === "partial") return L.statusPartial;
  return L.statusEmpty;
}

function renderArtifact(art, L, lang) {
  const artId = `art-${esc(art.id || "x")}`;
  if (!art.ready) {
    return `<article class="artifact is-empty" id="${artId}"><h3>${esc(art.title)}</h3><p class="empty">${esc(L.emptyStage)}</p></article>`;
  }
  if (art.kind === "timeline") {
    const versions = Array.isArray(art.versions) ? art.versions : [];
    const items = versions
      .map((v) => {
        let body = "";
        if (Array.isArray(v.modules) && v.modules.length) {
          body = `<div class="mod-grid">${v.modules
            .map((m, i) => moduleCard(m, L, { index: i + 1 }))
            .join("")}</div>`;
        } else if (v.revise) {
          body = cardBlock(v.revise, L);
        }
        return `<li class="tl-item" id="${esc(v.id)}"><div class="tl-meta"><span class="tl-label">${esc(v.label)}</span><time>${esc(fmtAt(v.at, lang))}</time></div><div class="tl-body">${body}</div></li>`;
      })
      .join("");
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3><p class="eyebrow">${esc(L.timeline)}</p><ol class="timeline">${items}</ol></article>`;
  }
  if (art.kind === "confirmations") {
    const list = art.confirmations || [];
    const rows = list
      .map(
        (c, i) => {
          const mid = c.moduleId || c.title || `m${i + 1}`;
          return `<tr>
  <td class="reg-num">${esc(String(i + 1).padStart(2, "0"))}</td>
  <td class="reg-name"><a href="#mod-${esc(mid)}">${esc(c.title)}</a></td>
  <td class="reg-status"><span class="badge ok">${esc(L.confirmed)}</span></td>
  <td class="reg-jump"><a href="#mod-${esc(mid)}">${esc(L.jump)}</a></td>
</tr>`;
        },
      )
      .join("");
    return `<article class="artifact" id="${artId}">
  <h3>${esc(art.title)}</h3>
  <p class="eyebrow">${esc(L.confirmRegistry)}</p>
  <table class="confirm-table">
    <thead><tr><th>#</th><th>${esc(L.module)}</th><th></th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</article>`;
  }
  if (art.kind === "architecture") {
    const link = art.url
      ? `<p><a class="btn" href="${esc(art.url)}" target="_blank" rel="noopener">${esc(L.openArch)}</a></p>`
      : "";
    const sum = art.summary
      ? `<div class="summary flow-summary">${structuredBody(art.summary, { as: "auto" })}</div>`
      : "";
    const conf = art.confirmed
      ? `<p class="badge ok">${esc(L.confirmed)}</p>`
      : "";
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3>${conf}${sum}${link}</article>`;
  }
  if (art.kind === "link") {
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3><p><a class="btn" href="${esc(art.url)}" target="_blank" rel="noopener">${esc(L.openLink)}</a></p><p class="path">${esc(art.url)}</p></article>`;
  }
  if (art.kind === "taskpool") {
    const meta = art.meta ? `<p class="meta">${esc(art.meta)}</p>` : "";
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3>${meta}${renderTaskPoolHtml(art.body, L)}</article>`;
  }
  if (art.kind === "pre") {
    const meta = art.meta ? `<p class="meta">${esc(art.meta)}</p>` : "";
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3>${meta}${renderTaskPoolHtml(art.body, L)}</article>`;
  }
  if (art.kind === "card") {
    const time = art.at
      ? `<p class="meta"><time>${esc(fmtAt(art.at, lang))}</time></p>`
      : "";
    return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3>${time}${cardBlock(art.card, L)}</article>`;
  }
  return `<article class="artifact" id="${artId}"><h3>${esc(art.title)}</h3><div class="summary">${structuredBody(art.body || "")}</div></article>`;
}

/**
 * @param {ReturnType<typeof buildDeliverablesModel>} model
 */
export function renderDeliverablesHtml(model) {
  const lang = model.lang === "en" ? "en" : "zh";
  const L = labelsFor(lang);
  const stages = model.stages || [];
  const tocHtml = `<nav class="toc" aria-label="${esc(L.toc)}">
  <p class="toc-title">${esc(L.toc)}</p>
  <ol class="toc-list">
    ${stages
      .map((stage, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        const readyN = (stage.artifacts || []).filter((a) => a.ready).length;
        const totalN = (stage.artifacts || []).length;
        return `<li class="toc-item status-${esc(stage.status)}">
  <a href="#stage-${esc(stage.id)}"><span class="toc-num">${esc(num)}</span><span class="toc-name">${esc(stage.title)}</span><span class="toc-meta">${esc(statusLabel(stage.status, L))} · ${readyN}/${totalN}</span></a>
  <ul class="toc-arts">${(stage.artifacts || [])
    .map(
      (a) =>
        `<li><a href="#art-${esc(a.id)}">${esc(a.title)}${a.ready ? "" : ` · ${esc(L.emptyStage)}`}</a></li>`,
    )
    .join("")}</ul>
</li>`;
      })
      .join("\n")}
  </ol>
</nav>`;

  const stagesHtml = stages
    .map((stage, idx) => {
      const arts = (stage.artifacts || [])
        .map((a) => renderArtifact(a, L, lang))
        .join("\n");
      const num = String(idx + 1).padStart(2, "0");
      return `<section class="stage status-${esc(stage.status)}" id="stage-${esc(stage.id)}">
  <header class="stage-head">
    <h2><span class="stage-num">${esc(num)}</span>${esc(stage.title)}</h2>
    <span class="pill">${esc(statusLabel(stage.status, L))}</span>
  </header>
  <div class="stage-body">${arts || `<p class="empty">${esc(L.emptyStage)}</p>`}</div>
</section>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${lang === "en" ? "en" : "zh-CN"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(L.pageTitle)} · ${esc(model.projectTitle)}</title>
<style>
:root {
  --paper: #ffffff;
  --wash: #f6f7f8;
  --ink: #121417;
  --ink-soft: #2c3238;
  --mute: #6a727a;
  --line: #e6e8eb;
  --line-strong: #d0d4d8;
  --accent: #243d4a;
  --ok-bg: #f1f6f2;
  --ok-ink: #2a4a34;
  --font-d: "Source Han Serif SC", "Songti SC", "Noto Serif SC", "Iowan Old Style", Georgia, serif;
  --font-b: "PingFang SC", "Hiragino Sans GB", "Avenir Next", "Segoe UI", sans-serif;
  --rail: 13.5rem;
  --measure: 40rem;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
body {
  margin: 0;
  min-height: 100%;
  background: var(--wash);
  color: var(--ink);
  font-family: var(--font-b);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
.shell {
  max-width: calc(var(--rail) + var(--measure) + 6rem);
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4.5rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}
@media (min-width: 960px) {
  .shell {
    grid-template-columns: var(--rail) minmax(0, var(--measure));
    gap: 3.25rem;
    padding: 3.25rem 2rem 5.5rem;
    align-items: start;
  }
}
.toc {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
}
@media (min-width: 960px) {
  .toc {
    position: sticky;
    top: 1.5rem;
    max-height: calc(100vh - 3rem);
    overflow: auto;
    padding-top: 0.25rem;
  }
}
.toc-title {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mute);
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.15rem;
  border-left: 1px solid var(--line);
}
.toc-item > a {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.55rem;
  padding: 0.45rem 0 0.45rem 0.9rem;
  margin-left: -1px;
  border-left: 2px solid transparent;
  text-decoration: none;
  color: var(--ink-soft);
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1.35;
}
.toc-item > a:hover {
  color: var(--accent);
  border-left-color: var(--accent);
}
.toc-num {
  font-variant-numeric: tabular-nums;
  color: var(--mute);
  font-size: 0.8125rem;
  font-weight: 500;
}
.toc-name { flex: 1 1 auto; min-width: 4rem; }
.toc-meta {
  width: 100%;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--mute);
}
.toc-arts {
  list-style: none;
  margin: 0 0 0.35rem;
  padding: 0 0 0 0.9rem;
  display: grid;
  gap: 0.1rem;
}
.toc-arts a {
  font-size: 0.8125rem;
  color: var(--mute);
  text-decoration: none;
  line-height: 1.4;
}
.toc-arts a:hover { color: var(--accent); }
.main {
  min-width: 0;
  background: var(--paper);
  border: 1px solid var(--line);
  padding: 2rem 1.35rem 2.5rem;
}
@media (min-width: 640px) {
  .main { padding: 2.75rem 2.75rem 3.25rem; }
}
.hero {
  margin: 0 0 2.75rem;
  padding: 0 0 1.75rem;
  border-bottom: 1px solid var(--line);
  text-align: left;
}
.brand {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--mute);
}
.hero-project {
  margin: 0 0 0.5rem;
  font-family: var(--font-d);
  font-weight: 600;
  font-size: clamp(1.85rem, 4.5vw, 2.55rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--ink);
}
h1.page-title {
  margin: 0 0 0.65rem;
  font-family: var(--font-b);
  font-weight: 500;
  font-size: 1rem;
  color: var(--ink-soft);
}
.sub {
  margin: 0;
  max-width: 32rem;
  color: var(--mute);
  font-size: 0.9375rem;
  line-height: 1.55;
}
.meta-line {
  margin: 1.15rem 0 0;
  font-size: 0.8125rem;
  color: var(--mute);
}
.stage { margin: 0 0 3rem; padding: 0; }
.stage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin: 0 0 1.35rem;
  padding: 0 0 0.75rem;
  border-bottom: 1px solid var(--line-strong);
}
.stage-head h2 {
  margin: 0;
  font-family: var(--font-d);
  font-size: clamp(1.35rem, 2.8vw, 1.65rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}
.stage-num {
  font-family: var(--font-b);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
}
.pill {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--mute);
  padding: 0;
  border: none;
  background: transparent;
}
.status-done .pill { color: var(--ok-ink); }
.status-partial .pill { color: #6a552e; }
.artifact {
  margin: 0 0 1.75rem;
  padding: 0;
  border: none;
  background: transparent;
}
.artifact + .artifact {
  padding-top: 1.5rem;
  border-top: 1px dashed var(--line);
}
.artifact h3 {
  margin: 0 0 0.85rem;
  font-family: var(--font-d);
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.eyebrow {
  margin: -0.35rem 0 1rem;
  font-size: 0.8125rem;
  color: var(--mute);
}
.empty {
  margin: 0.35rem 0;
  color: var(--mute);
  font-size: 0.9375rem;
}
.card-dl { margin: 0; }
.card-row {
  margin: 0;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--line);
}
.card-row:first-child { padding-top: 0; }
.card-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.card-row dt {
  margin: 0 0 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mute);
}
.card-row dd { margin: 0; color: var(--ink-soft); }
.card-row:first-child dd .struct-p {
  font-size: 1.02rem;
  color: var(--ink);
  line-height: 1.6;
}
.struct-list,
.struct-ol {
  margin: 0;
  padding: 0 0 0 1.2rem;
}
.struct-list li,
.struct-ol li {
  margin: 0.4rem 0;
  padding-left: 0.2rem;
  color: var(--ink-soft);
}
.struct-ol { list-style: decimal; }
.struct-p {
  margin: 0 0 0.4rem;
  color: var(--ink-soft);
  white-space: pre-wrap;
  word-break: break-word;
}
.struct-p:last-child { margin-bottom: 0; }
.chip-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.chip {
  font-size: 0.875rem;
  color: var(--ink-soft);
  background: var(--wash);
  border: none;
  padding: 0.3rem 0.55rem;
}
.flow-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.flow-steps li {
  position: relative;
  display: grid;
  grid-template-columns: 1.1rem 1fr;
  gap: 0.65rem;
  padding: 0.55rem 0 0.55rem 0.15rem;
  align-items: start;
}
.flow-steps li::before {
  content: "";
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.45rem;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}
.flow-steps li:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 0.38rem;
  top: 1.25rem;
  bottom: -0.1rem;
  width: 1px;
  background: var(--line-strong);
}
.flow-node {
  display: block;
  font-size: 0.9375rem;
  color: var(--ink);
  background: transparent;
  border: none;
  padding: 0;
  max-width: none;
  line-height: 1.5;
}
.mod-grid { display: grid; gap: 1.75rem; }
.mod-card {
  margin: 0;
  padding: 0 0 0 1rem;
  border: none;
  border-left: 3px solid var(--accent);
  background: transparent;
}
.mod-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin: 0 0 0.85rem;
  padding: 0;
  border: none;
}
.mod-index {
  font-family: var(--font-b);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mute);
  font-variant-numeric: tabular-nums;
}
.mod-titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem 0.75rem;
  flex: 1;
  min-width: 0;
}
.mod-card h5 {
  margin: 0;
  font-family: var(--font-d);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ink);
}
.mod-card .card-dl {
  background: transparent;
  padding: 0;
  border: none;
}
.confirm-table,
.task-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
}
.confirm-table th,
.task-table th {
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mute);
  padding: 0.35rem 0.5rem 0.55rem 0;
  border-bottom: 1px solid var(--line-strong);
  background: transparent;
  text-transform: none;
  letter-spacing: 0;
}
.confirm-table td,
.task-table td {
  padding: 0.75rem 0.5rem 0.75rem 0;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
  color: var(--ink-soft);
}
.confirm-table tr:last-child td,
.task-table tr:last-child td { border-bottom: 0; }
.confirm-table a,
.task-table a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
.confirm-table a:hover { text-decoration: underline; }
.reg-num, .task-id {
  font-variant-numeric: tabular-nums;
  color: var(--mute);
  width: 3rem;
  white-space: nowrap;
  font-size: 0.8125rem;
}
.task-check { width: 1.25rem; color: var(--mute); }
.task-mod {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--mute);
  background: var(--wash);
  border: none;
  padding: 0.1rem 0.4rem;
  margin: 0 0.4rem 0.2rem 0;
}
.task-title { color: var(--ink); }
.task-deps {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--mute);
}
.task-table tr[data-done="true"] .task-title {
  color: var(--mute);
  text-decoration: line-through;
}
.task-pool-wrap { overflow-x: auto; }
.summary {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  white-space: normal;
  font-size: 0.9375rem;
  color: var(--ink-soft);
}
.flow-summary { padding: 0 0 0.75rem; }
.timeline { list-style: none; margin: 0; padding: 0; }
.tl-item {
  margin: 0;
  padding: 0 0 1.75rem;
  border: none;
}
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { display: none; }
.tl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  align-items: baseline;
  margin: 0 0 1rem;
}
.tl-label {
  font-family: var(--font-d);
  font-size: 1.05rem;
  font-weight: 600;
}
.tl-meta time {
  color: var(--mute);
  font-size: 0.8125rem;
}
.btn {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
  padding: 0.55rem 1rem;
}
.btn:hover { background: #1a2f3a; border-color: #1a2f3a; }
.badge.ok {
  display: inline-block;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ok-ink);
  border: none;
  background: var(--ok-bg);
  padding: 0.18rem 0.45rem;
}
.artifact > .badge.ok { margin: 0 0 0.75rem; }
.path, .meta {
  color: var(--mute);
  font-size: 0.8125rem;
  margin: 0.35rem 0 0.75rem;
}
.footer-note {
  margin: 2.5rem 0 0;
  padding: 1.15rem 0 0;
  border-top: 1px solid var(--line);
  font-size: 0.75rem;
  color: var(--mute);
  text-align: left;
}
@media print {
  body { background: #fff; }
  .shell { display: block; max-width: none; padding: 0; }
  .toc { display: none; }
  .main { border: none; padding: 0; }
}
</style>
</head>
<body>
<div class="shell">
${tocHtml}
<main class="main">
  <header class="hero">
    <p class="brand">${esc(L.brand)}</p>
    <p class="hero-project">${esc(model.projectTitle)}</p>
    <h1 class="page-title">${esc(L.pageTitle)}</h1>
    <p class="sub">${esc(L.subtitle)}</p>
    <p class="meta-line">${esc(L.generated)} · ${esc(fmtAt(model.generatedAt, lang))}</p>
  </header>
  ${stagesHtml}
  <p class="footer-note">${esc(model.projectPath || "")}</p>
</main>
</div>
</body>
</html>`;
}


/**
 * Write HTML next to project chat JSON. Returns absolute path or null.
 */
export function writeDeliverablesHtmlFile(liveRoot, projectPath, html) {
  const key = projectChatKey(projectPath);
  if (!key || !liveRoot) return null;
  const dir = path.join(liveRoot, "project-chats");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${key}-deliverables.html`);
  fs.writeFileSync(file, html, "utf8");
  return file;
}
