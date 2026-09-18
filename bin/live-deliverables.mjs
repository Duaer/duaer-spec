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

function cardBlock(card, labels) {
  const c = card || {};
  const rows = [
    [labels.goal, c.goal],
    [labels.out, c.outOfScope],
    [labels.accept, c.acceptance],
    [labels.assume, c.assumptions],
  ].filter(([, v]) => String(v || "").trim());
  if (!rows.length) return `<p class="empty">${esc(labels.emptyCard)}</p>`;
  return rows
    .map(
      ([k, v]) =>
        `<div class="field"><h4>${esc(k)}</h4><pre>${esc(v)}</pre></div>`,
    )
    .join("");
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
          kind: "pre",
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
      openArch: "Open diagram",
      openLink: "Open",
      confirmed: "Confirmed",
      draft: "Draft",
      module: "Module",
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
    openArch: "打开架构图",
    openLink: "打开",
    confirmed: "已确认",
    draft: "草稿",
    module: "模块",
  };
}

function statusLabel(status, L) {
  if (status === "done") return L.statusDone;
  if (status === "partial") return L.statusPartial;
  return L.statusEmpty;
}

function renderArtifact(art, L, lang) {
  if (!art.ready) {
    return `<article class="artifact is-empty"><h3>${esc(art.title)}</h3><p class="empty">${esc(L.emptyStage)}</p></article>`;
  }
  if (art.kind === "timeline") {
    const versions = Array.isArray(art.versions) ? art.versions : [];
    const items = versions
      .map((v) => {
        let body = "";
        if (Array.isArray(v.modules) && v.modules.length) {
          body = v.modules
            .map(
              (m) =>
                `<div class="mod"><h5>${esc(L.module)} · ${esc(m.title)}</h5>${cardBlock(m.card, L)}</div>`,
            )
            .join("");
        } else if (v.revise) {
          body = cardBlock(v.revise, L);
        }
        return `<li class="tl-item"><div class="tl-meta"><span class="tl-label">${esc(v.label)}</span><time>${esc(fmtAt(v.at, lang))}</time></div><div class="tl-body">${body}</div></li>`;
      })
      .join("");
    return `<article class="artifact"><h3>${esc(art.title)}</h3><p class="eyebrow">${esc(L.timeline)}</p><ol class="timeline">${items}</ol></article>`;
  }
  if (art.kind === "confirmations") {
    const list = (art.confirmations || [])
      .map(
        (c) =>
          `<div class="mod"><h5>${esc(c.title)} · ${esc(L.confirmed)}</h5>${cardBlock(c.card, L)}</div>`,
      )
      .join("");
    return `<article class="artifact"><h3>${esc(art.title)}</h3>${list}</article>`;
  }
  if (art.kind === "architecture") {
    const link = art.url
      ? `<p><a class="btn" href="${esc(art.url)}" target="_blank" rel="noopener">${esc(L.openArch)}</a></p>`
      : "";
    const sum = art.summary
      ? `<pre class="summary">${esc(art.summary)}</pre>`
      : "";
    const conf = art.confirmed
      ? `<p class="badge ok">${esc(L.confirmed)}</p>`
      : "";
    return `<article class="artifact"><h3>${esc(art.title)}</h3>${conf}${sum}${link}</article>`;
  }
  if (art.kind === "link") {
    return `<article class="artifact"><h3>${esc(art.title)}</h3><p><a class="btn" href="${esc(art.url)}" target="_blank" rel="noopener">${esc(L.openLink)}</a></p><p class="path">${esc(art.url)}</p></article>`;
  }
  if (art.kind === "pre") {
    const meta = art.meta ? `<p class="meta">${esc(art.meta)}</p>` : "";
    return `<article class="artifact"><h3>${esc(art.title)}</h3>${meta}<pre>${esc(art.body)}</pre></article>`;
  }
  if (art.kind === "card") {
    const time = art.at
      ? `<p class="meta"><time>${esc(fmtAt(art.at, lang))}</time></p>`
      : "";
    return `<article class="artifact"><h3>${esc(art.title)}</h3>${time}${cardBlock(art.card, L)}</article>`;
  }
  return `<article class="artifact"><h3>${esc(art.title)}</h3><pre>${esc(art.body || "")}</pre></article>`;
}

/**
 * @param {ReturnType<typeof buildDeliverablesModel>} model
 */
export function renderDeliverablesHtml(model) {
  const lang = model.lang === "en" ? "en" : "zh";
  const L = labelsFor(lang);
  const stagesHtml = (model.stages || [])
    .map((stage, idx) => {
      const arts = (stage.artifacts || [])
        .map((a) => renderArtifact(a, L, lang))
        .join("\n");
      const num = String(idx + 1).padStart(2, "0");
      return `<section class="stage status-${esc(stage.status)}" id="stage-${esc(stage.id)}">
  <header class="stage-head">
    <p class="stage-num">${esc(num)}</p>
    <div class="stage-titles">
      <h2>${esc(stage.title)}</h2>
      <span class="pill">${esc(statusLabel(stage.status, L))}</span>
    </div>
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet" />
<style>
:root {
  --paper: #ffffff;
  --paper-soft: #f7f6f3;
  --ink: #1a1a1a;
  --ink-soft: #3d3d3d;
  --mute: #6b6b6b;
  --line: #e4e1da;
  --accent: #1c2b3a;
  --font-d: "Cormorant Garamond", "Songti SC", "Times New Roman", serif;
  --font-b: "DM Sans", "PingFang SC", "Hiragino Sans GB", sans-serif;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(900px 420px at 50% -8%, rgba(28, 43, 58, 0.05), transparent 58%),
    linear-gradient(180deg, #faf9f7 0%, var(--paper) 28%, var(--paper) 100%);
  color: var(--ink);
  font-family: var(--font-b);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.wrap {
  max-width: 44rem;
  margin: 0 auto;
  padding: 4.5rem 1.75rem 5.5rem;
}
.hero {
  margin-bottom: 3.75rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--line);
  text-align: center;
}
.brand {
  font-family: var(--font-b);
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 0.68rem;
  color: var(--mute);
  margin: 0 0 1.35rem;
}
.hero-project {
  font-family: var(--font-d);
  font-weight: 600;
  font-size: clamp(2.6rem, 7vw, 3.85rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  margin: 0 0 0.85rem;
  color: var(--ink);
}
h1.page-title {
  font-family: var(--font-b);
  font-weight: 500;
  font-size: 0.95rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin: 0 0 0.75rem;
  color: var(--ink-soft);
}
.sub {
  margin: 0 auto;
  max-width: 28rem;
  color: var(--mute);
  font-size: 1.05rem;
  font-weight: 400;
  line-height: 1.5;
}
.meta-line {
  margin: 1.75rem 0 0;
  font-size: 0.78rem;
  color: var(--mute);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.5rem;
}
.stage {
  margin: 0 0 3.25rem;
  padding: 0;
  background: transparent;
  border: none;
}
.stage-head {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem 1.35rem;
  align-items: end;
  margin-bottom: 1.65rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--line);
}
.stage-num {
  font-family: var(--font-d);
  font-size: 2.75rem;
  font-weight: 600;
  line-height: 0.9;
  margin: 0;
  color: var(--accent);
  letter-spacing: -0.03em;
}
.stage-titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  min-width: 0;
}
.stage-head h2 {
  font-family: var(--font-d);
  font-size: clamp(1.55rem, 3.5vw, 1.95rem);
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}
.pill {
  font-family: var(--font-b);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.28rem 0.55rem;
  border: 1px solid var(--line);
  color: var(--mute);
  background: var(--paper-soft);
}
.status-done .pill {
  border-color: #c8d4c4;
  color: #2f4a34;
  background: #eef4ec;
}
.status-partial .pill {
  border-color: #ddd4c4;
  color: #5c4a2e;
  background: #f7f1e6;
}
.artifact {
  margin: 0 0 1.85rem;
  padding: 0;
  border: none;
}
.artifact h3 {
  font-family: var(--font-d);
  font-size: 1.28rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  letter-spacing: -0.01em;
}
.eyebrow {
  font-family: var(--font-b);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--mute);
  margin: 0 0 1rem;
}
.empty {
  color: var(--mute);
  font-style: italic;
  margin: 0.5rem 0;
  font-size: 0.95rem;
}
.field { margin: 0.55rem 0 0.95rem; }
.field h4 {
  font-family: var(--font-b);
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--mute);
  margin: 0 0 0.35rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
pre, .summary {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-b);
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--ink-soft);
  background: var(--paper-soft);
  border: 1px solid var(--line);
  padding: 1rem 1.1rem;
}
.timeline { list-style: none; margin: 0; padding: 0; }
.tl-item {
  position: relative;
  padding: 0 0 1.75rem 1.5rem;
  border-left: 1px solid var(--line);
  margin-left: 0.35rem;
}
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 0.45rem;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(28, 43, 58, 0.08);
}
.tl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 1.1rem;
  align-items: baseline;
  margin-bottom: 0.65rem;
}
.tl-label {
  font-family: var(--font-d);
  font-size: 1.15rem;
  font-weight: 600;
}
.tl-meta time { color: var(--mute); font-size: 0.82rem; }
.mod { margin: 0.85rem 0 1.15rem; }
.mod h5 {
  font-family: var(--font-b);
  font-size: 0.88rem;
  font-weight: 600;
  margin: 0 0 0.45rem;
  color: var(--ink);
}
.btn {
  display: inline-block;
  font-family: var(--font-b);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-decoration: none;
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
  padding: 0.55rem 1.05rem;
}
.btn:hover { background: #0f1822; border-color: #0f1822; }
.badge.ok {
  display: inline-block;
  font-family: var(--font-b);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2f4a34;
  border: 1px solid #c8d4c4;
  background: #eef4ec;
  padding: 0.2rem 0.5rem;
  margin: 0 0 0.65rem;
}
.path, .meta {
  color: var(--mute);
  font-size: 0.82rem;
}
.footer-note {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  text-align: center;
  font-size: 0.75rem;
  color: var(--mute);
  letter-spacing: 0.06em;
}
@media print {
  html, body { background: #fff; }
  .wrap { padding: 1.5rem 0; max-width: none; }
  .btn { color: #111; background: #fff; border-color: #111; }
}
</style>
</head>
<body>
<main class="wrap">
  <header class="hero">
    <p class="brand">${esc(L.brand)}</p>
    <p class="hero-project">${esc(model.projectTitle)}</p>
    <h1 class="page-title">${esc(L.pageTitle)}</h1>
    <p class="sub">${esc(L.subtitle)}</p>
    <div class="meta-line">
      <span>${esc(L.generated)} · ${esc(fmtAt(model.generatedAt, lang))}</span>
    </div>
  </header>
  ${stagesHtml}
  <p class="footer-note">${esc(L.brand)}</p>
</main>
</body>
</html>
`;
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
