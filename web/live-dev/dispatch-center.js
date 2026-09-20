/**
 * Standalone dispatch-center page: 100px project rail + task graph.
 * Same top nav as the desk; project / employee / settings open on `/`.
 */
import { t, getLocale, initI18n, onLocaleChange, setLocale } from "./i18n.js";
import {
  mountArchitectureDiagram,
  clearArchitectureMount,
} from "./architecture-mount.mjs?v=node-zoom-1";
import {
  buildTaskArchitectureIr,
  taskPoolToArchitectureIr,
} from "./task-graph.mjs";

const projectsEl = document.getElementById("dispatchCenterProjects");
const emptyEl = document.getElementById("dispatchCenterEmpty");
const mount = document.getElementById("taskGraphMount");
const projectBadge = document.getElementById("projectBadge");
const langSelect = document.getElementById("langSelect");
const githubStars = document.getElementById("githubStars");
const githubStarCount = document.getElementById("githubStarCount");

let projects = [];
let renderSeq = 0;

function pathKey(p) {
  return String(p || "")
    .trim()
    .replace(/\/+$/, "");
}

function currentPath() {
  return new URL(location.href).searchParams.get("path") || "";
}

function setCurrentPath(path) {
  const u = new URL(location.href);
  const next = String(path || "").trim();
  if (next) u.searchParams.set("path", next);
  else u.searchParams.delete("path");
  history.replaceState(null, "", u);
  syncProjectBadge();
}

function deskUrl(open) {
  const u = new URL("/", location.origin);
  if (open) u.searchParams.set("open", open);
  return u.href;
}

function goDesk(open) {
  location.href = deskUrl(open);
}

function syncProjectBadge() {
  if (!projectBadge) return;
  const path = currentPath();
  const proj = projects.find((p) => pathKey(p.path) === pathKey(path));
  if (!proj) {
    projectBadge.textContent = t("project.noneBadge");
    return;
  }
  projectBadge.textContent = proj.title || proj.name || proj.path;
}

function formatStarCount(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "—";
  if (n < 1000) return String(Math.floor(n));
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n / 1000)}k`;
}

async function refreshGithubStars() {
  if (!githubStars || !githubStarCount) return;
  try {
    const res = await fetch("/api/github");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    if (data.url) githubStars.href = data.url;
    githubStarCount.textContent = formatStarCount(data.stars);
  } catch {
    /* keep fallback */
  }
}

function wireTopNav() {
  document.getElementById("historyToggle")?.addEventListener("click", () => {
    goDesk("projects");
  });
  document.getElementById("employeeToggle")?.addEventListener("click", () => {
    goDesk("employees");
  });
  document.getElementById("cfgOpen")?.addEventListener("click", () => {
    goDesk("settings");
  });
  if (langSelect) {
    langSelect.value = getLocale();
    langSelect.addEventListener("change", () => {
      setLocale(langSelect.value);
    });
  }
  void refreshGithubStars();
}

function showEmpty() {
  clearArchitectureMount(mount);
  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent = t("dispatch.centerEmpty");
  }
}

function renderRail() {
  if (!projectsEl) return;
  projectsEl.replaceChildren();
  if (!projects.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = t("project.emptyList");
    projectsEl.appendChild(p);
    return;
  }
  const selected = pathKey(currentPath());
  for (const proj of projects) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dispatch-center-project";
    const label = proj.title || proj.name || proj.path;
    btn.textContent = label;
    btn.title = label;
    const pressed = pathKey(proj.path) === selected;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.addEventListener("click", () => {
      setCurrentPath(proj.path);
      renderRail();
      void renderGraph(proj.path);
    });
    projectsEl.appendChild(btn);
  }
  syncProjectBadge();
}

async function renderGraph(projectPath) {
  const seq = ++renderSeq;
  const path = String(projectPath || "").trim();
  if (!path) {
    showEmpty();
    return;
  }
  let modules = [];
  let workerCount = 1;
  let savedTasks = null;
  let savedGraphUrl = "";
  let progress = null;
  let jobId = "";
  try {
    const res = await fetch(`/api/projects/chat?path=${encodeURIComponent(path)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "load failed");
    modules = Array.isArray(data.modules) ? data.modules : [];
    workerCount = Number(data.workerCount) || 1;
    savedTasks = Array.isArray(data.taskPool?.tasks) ? data.taskPool.tasks : null;
    savedGraphUrl = String(data.dispatchGraphUrl || "").trim();
    jobId = String(data.jobId || "").trim();
  } catch {
    modules = [];
  }
  if (jobId) {
    try {
      const st = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`);
      const body = await st.json().catch(() => ({}));
      if (st.ok && body.progress) progress = body.progress;
    } catch {
      /* ignore */
    }
  }
  if (seq !== renderSeq) return;
  const confirmed = modules.filter((m) => m && m.status === "confirmed");
  let ir = null;
  if (savedTasks?.length) {
    ir = taskPoolToArchitectureIr(savedTasks, {
      title: t("dispatch.taskGraph"),
      workerCount,
      locale: getLocale(),
      progress,
    });
  } else if (confirmed.length) {
    ir = buildTaskArchitectureIr(confirmed, workerCount, {
      title: t("dispatch.taskGraph"),
      locale: getLocale(),
    }).ir;
  }
  if (!ir?.components?.length && !savedGraphUrl) {
    showEmpty();
    return;
  }
  try {
    let url = savedGraphUrl;
    if (!url) {
      const res = await fetch("/api/architecture/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ir }),
      });
      const data = await res.json().catch(() => ({}));
      if (seq !== renderSeq) return;
      if (!res.ok) throw new Error(data.error || "render failed");
      url = String(data.url || "").trim();
    }
    if (seq !== renderSeq) return;
    if (!url) throw new Error("render failed");
    if (emptyEl) emptyEl.hidden = true;
    if (mount) mount.dataset.archUrl = url;
    await mountArchitectureDiagram(mount, { url, ir: null, stage: true });
  } catch {
    if (seq !== renderSeq) return;
    showEmpty();
  }
}

async function load() {
  try {
    const res = await fetch("/api/projects");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "projects failed");
    projects = data.projects || [];
  } catch {
    projects = [];
  }
  if (!currentPath()) {
    const fallback = projects[0]?.path || "";
    if (fallback) setCurrentPath(fallback);
  }
  renderRail();
  await renderGraph(currentPath());
}

initI18n();
wireTopNav();
onLocaleChange(() => {
  if (langSelect) langSelect.value = getLocale();
  renderRail();
  void renderGraph(currentPath());
});
void load();
