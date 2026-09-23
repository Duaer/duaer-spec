/**
 * Standalone dispatch-center page: 100px project rail + task graph /
 * system architecture per project.
 * Same top nav as the console; project / employee / settings open on `/`.
 * Graph rebuilds from live job progress so node status stays current.
 */
import { t, getLocale, initI18n, onLocaleChange, setLocale, applyDomI18n } from "./i18n.js";
import { getTheme, initTheme, toggleTheme } from "./theme.mjs";
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
const projectToggle = document.getElementById("historyToggle");
const langSelect = document.getElementById("langSelect");
const githubStars = document.getElementById("githubStars");
const githubStarCount = document.getElementById("githubStarCount");
const viewGraphBtn = document.getElementById("dispatchViewGraph");
const viewArchBtn = document.getElementById("dispatchViewArch");

const STATUS_POLL_MS = 2500;

let projects = [];
let renderSeq = 0;
let pollTimer = 0;
let lastProgressFp = "";
/** @type {Array<object>|null} */
let cachedTasks = null;
let cachedWorkerCount = 1;
let cachedJobId = "";
/** @type {"graph"|"architecture"} */
let viewMode = "graph";

function pathKey(p) {
  return String(p || "")
    .trim()
    .replace(/\/+$/, "");
}

function currentPath() {
  return new URL(location.href).searchParams.get("path") || "";
}

function currentView() {
  const v = new URL(location.href).searchParams.get("view") || "";
  return v === "architecture" ? "architecture" : "graph";
}

function setCurrentPath(path) {
  const u = new URL(location.href);
  const next = String(path || "").trim();
  if (next) u.searchParams.set("path", next);
  else u.searchParams.delete("path");
  history.replaceState(null, "", u);
  syncProjectBadge();
}

function setViewMode(mode, { render = true } = {}) {
  viewMode = mode === "architecture" ? "architecture" : "graph";
  const u = new URL(location.href);
  if (viewMode === "architecture") u.searchParams.set("view", "architecture");
  else u.searchParams.delete("view");
  history.replaceState(null, "", u);
  syncViewTabs();
  if (render) void renderStage(currentPath());
}

function syncViewTabs() {
  const graphOn = viewMode === "graph";
  if (viewGraphBtn) viewGraphBtn.setAttribute("aria-selected", graphOn ? "true" : "false");
  if (viewArchBtn) {
    viewArchBtn.setAttribute("aria-selected", graphOn ? "false" : "true");
  }
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
  if (!projectToggle) return;
  const path = currentPath();
  const proj = projects.find((p) => pathKey(p.path) === pathKey(path));
  if (!proj) {
    projectToggle.textContent = t("project.noneBadge");
    projectToggle.classList.add("is-empty");
    projectToggle.classList.remove("is-active");
    return;
  }
  projectToggle.textContent = t("project.activeBadge", {
    name: proj.title || proj.name || proj.path,
  });
  projectToggle.classList.add("is-active");
  projectToggle.classList.remove("is-empty");
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

function syncThemeToggleUi() {
  const btn = document.getElementById("themeToggle");
  const label = document.getElementById("themeToggleLabel");
  const theme = getTheme();
  if (btn) {
    btn.dataset.theme = theme;
    btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", t("theme.aria"));
  }
  if (label) {
    label.textContent = theme === "dark" ? t("theme.toLight") : t("theme.toDark");
  }
}

function wireTopNav() {
  projectToggle?.addEventListener("click", () => {
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
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", () => {
    toggleTheme();
    syncThemeToggleUi();
  });
  viewGraphBtn?.addEventListener("click", () => setViewMode("graph"));
  viewArchBtn?.addEventListener("click", () => setViewMode("architecture"));
  void refreshGithubStars();
}

function progressFingerprint(progress) {
  const tasks = Array.isArray(progress?.tasks) ? progress.tasks : [];
  return tasks
    .map((t) => `${String(t?.id || "").toUpperCase()}:${t?.done ? 1 : 0}`)
    .sort()
    .join("|");
}

function stopStatusPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = 0;
  }
}

function startStatusPoll() {
  stopStatusPoll();
  if (viewMode !== "graph") return;
  if (!cachedJobId || !cachedTasks?.length) return;
  pollTimer = setInterval(() => {
    void pollLiveProgress();
  }, STATUS_POLL_MS);
}

async function fetchJobProgress(jobId) {
  const id = String(jobId || "").trim();
  if (!id) return null;
  try {
    const st = await fetch(`/api/status?jobId=${encodeURIComponent(id)}`);
    const body = await st.json().catch(() => ({}));
    if (!st.ok) return null;
    return body.progress || null;
  } catch {
    return null;
  }
}

async function mountGraphIr(ir, seq) {
  const res = await fetch("/api/architecture/render", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ir }),
  });
  const data = await res.json().catch(() => ({}));
  if (seq !== renderSeq) return;
  if (!res.ok) throw new Error(data.error || "render failed");
  const url = String(data.url || "").trim();
  if (!url) throw new Error("render failed");
  if (emptyEl) emptyEl.hidden = true;
  if (mount) {
    mount.dataset.archUrl = url;
    delete mount.dataset.archKey;
  }
  await mountArchitectureDiagram(mount, { url, ir: null, stage: true });
}

async function remountWithProgress(progress, seq = renderSeq) {
  if (viewMode !== "graph") return;
  if (!cachedTasks?.length) return;
  const ir = taskPoolToArchitectureIr(cachedTasks, {
    title: t("dispatch.taskGraph"),
    workerCount: cachedWorkerCount,
    locale: getLocale(),
    progress,
  });
  await mountGraphIr(ir, seq);
}

async function pollLiveProgress() {
  if (viewMode !== "graph") return;
  if (!cachedJobId || !cachedTasks?.length) return;
  const progress = await fetchJobProgress(cachedJobId);
  if (!progress) return;
  const fp = progressFingerprint(progress);
  if (fp === lastProgressFp) return;
  lastProgressFp = fp;
  const seq = ++renderSeq;
  try {
    await remountWithProgress(progress, seq);
  } catch {
    /* keep last graph */
  }
}

function showEmpty(kind = viewMode) {
  stopStatusPoll();
  if (kind === "graph") {
    cachedTasks = null;
    cachedJobId = "";
    lastProgressFp = "";
  }
  clearArchitectureMount(mount);
  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent =
      kind === "architecture"
        ? t("dispatch.centerArchEmpty")
        : t("dispatch.centerEmpty");
  }
  if (kind === "architecture") syncViewTabs();
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
      void renderStage(proj.path);
    });
    projectsEl.appendChild(btn);
  }
  syncProjectBadge();
}

async function loadProjectChat(projectPath) {
  const path = String(projectPath || "").trim();
  if (!path) return null;
  const res = await fetch(`/api/projects/chat?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "load failed");
  return data;
}

async function renderArchitecture(projectPath) {
  const seq = ++renderSeq;
  stopStatusPoll();
  const path = String(projectPath || "").trim();
  if (!path) {
    showEmpty("architecture");
    return;
  }
  let archUrl = "";
  try {
    const data = await loadProjectChat(path);
    archUrl = String(data?.architecture?.url || "").trim();
  } catch {
    archUrl = "";
  }
  if (seq !== renderSeq) return;
  syncViewTabs();
  if (!archUrl) {
    showEmpty("architecture");
    return;
  }
  try {
    if (emptyEl) emptyEl.hidden = true;
    if (mount) {
      mount.dataset.archUrl = archUrl;
      delete mount.dataset.archKey;
    }
    await mountArchitectureDiagram(mount, {
      url: archUrl,
      ir: null,
      stage: true,
    });
  } catch {
    if (seq !== renderSeq) return;
    showEmpty("architecture");
  }
}

async function renderGraph(projectPath) {
  const seq = ++renderSeq;
  stopStatusPoll();
  const path = String(projectPath || "").trim();
  if (!path) {
    showEmpty("graph");
    return;
  }
  let modules = [];
  let workerCount = 1;
  let savedTasks = null;
  let savedGraphUrl = "";
  let progress = null;
  let jobId = "";
  try {
    const data = await loadProjectChat(path);
    modules = Array.isArray(data.modules) ? data.modules : [];
    workerCount = Number(data.workerCount) || 1;
    savedTasks = Array.isArray(data.taskPool?.tasks) ? data.taskPool.tasks : null;
    savedGraphUrl = String(data.dispatchGraphUrl || "").trim();
    jobId = String(data.jobId || "").trim();
  } catch {
    modules = [];
  }
  syncViewTabs();
  if (jobId) {
    progress = await fetchJobProgress(jobId);
  }
  if (seq !== renderSeq) return;
  const confirmed = modules.filter((m) => m && m.status === "confirmed");
  let ir = null;
  if (savedTasks?.length) {
    cachedTasks = savedTasks;
    cachedWorkerCount = workerCount;
    cachedJobId = jobId;
    lastProgressFp = progressFingerprint(progress);
    ir = taskPoolToArchitectureIr(savedTasks, {
      title: t("dispatch.taskGraph"),
      workerCount,
      locale: getLocale(),
      progress,
    });
  } else if (confirmed.length) {
    cachedTasks = null;
    cachedJobId = "";
    ir = buildTaskArchitectureIr(confirmed, workerCount, {
      title: t("dispatch.taskGraph"),
      locale: getLocale(),
    }).ir;
  } else {
    cachedTasks = null;
    cachedJobId = "";
  }
  if (!ir?.components?.length && !savedGraphUrl) {
    showEmpty("graph");
    return;
  }
  try {
    if (ir?.components?.length) {
      await mountGraphIr(ir, seq);
      startStatusPoll();
      return;
    }
    // Fallback: static cached URL only when no task IR exists.
    if (emptyEl) emptyEl.hidden = true;
    if (mount) {
      mount.dataset.archUrl = savedGraphUrl;
      delete mount.dataset.archKey;
    }
    await mountArchitectureDiagram(mount, {
      url: savedGraphUrl,
      ir: null,
      stage: true,
    });
  } catch {
    if (seq !== renderSeq) return;
    showEmpty("graph");
  }
}

async function renderStage(projectPath) {
  if (viewMode === "architecture") {
    await renderArchitecture(projectPath);
  } else {
    await renderGraph(projectPath);
  }
}

async function load() {
  viewMode = currentView();
  syncViewTabs();
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
  await renderStage(currentPath());
}

initI18n();
initTheme();
applyDomI18n();
syncThemeToggleUi();
wireTopNav();
onLocaleChange(() => {
  if (langSelect) langSelect.value = getLocale();
  if (viewGraphBtn) viewGraphBtn.textContent = t("dispatch.viewGraph");
  if (viewArchBtn) viewArchBtn.textContent = t("dispatch.viewArchitecture");
  syncThemeToggleUi();
  renderRail();
  void renderStage(currentPath());
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void pollLiveProgress();
});
void load();
