/**
 * Resolve / create product repo directories for live dispatch.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, parse, resolve } from "node:path";

/**
 * @param {string} repoPath
 * @param {{ projectsRoot?: string, home?: string }} [opts]
 */
export function resolveProductRepoPath(repoPath, opts = {}) {
  const raw = String(repoPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!raw) {
    const e = new Error("请填写仓库绝对路径，或项目名（需先设置产品父目录）");
    e.code = "EMPTY_PATH";
    throw e;
  }
  const home = resolve(opts.home || homedir());
  const projectsRoot = String(opts.projectsRoot || "")
    .trim()
    .replace(/[\\/]+$/, "");

  if (isAbsolute(raw)) {
    return resolve(raw);
  }

  if (!projectsRoot) {
    const e = new Error(
      `「${raw}」不是绝对路径。请填写完整路径，或先设置产品父目录后再填项目名`,
    );
    e.code = "NEED_PROJECTS_ROOT";
    throw e;
  }

  const parent = resolve(projectsRoot);
  if (!existsSync(parent) || !statSync(parent).isDirectory()) {
    const e = new Error(`产品父目录不存在或不是目录：${parent}`);
    e.code = "BAD_PROJECTS_ROOT";
    e.path = parent;
    throw e;
  }
  if (parent === home || parent === parse(parent).root) {
    const e = new Error("产品父目录不能是用户主目录或磁盘根，请选一层子目录（如 ~/Projects）");
    e.code = "BAD_PROJECTS_ROOT";
    e.path = parent;
    throw e;
  }

  return resolve(parent, raw);
}

/**
 * Create mode: only a single short folder name under the product parent.
 * Absolute paths and nested paths are refused so parent + name stay one story.
 * @param {string} folderName
 * @param {{ projectsRoot?: string, home?: string }} [opts]
 */
export function resolveCreateProductRepoPath(folderName, opts = {}) {
  const raw = String(folderName || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!raw) {
    const e = new Error("请填写要新建的目录短名");
    e.code = "EMPTY_PATH";
    throw e;
  }
  if (isAbsolute(raw) || /[\\/]/.test(raw) || raw === "." || raw === "..") {
    const e = new Error(
      "新建只能填目录短名（如 my-app），不要填绝对路径。目录将建在产品父目录下；已有项目请从下方列表打开或点「浏览…」",
    );
    e.code = "NEED_SHORT_NAME";
    throw e;
  }
  const projectsRoot = String(opts.projectsRoot || "").trim();
  if (!projectsRoot) {
    const e = new Error("新建前请先选择产品父目录");
    e.code = "NEED_PROJECTS_ROOT";
    throw e;
  }
  return resolveProductRepoPath(raw, opts);
}

/**
 * Create mode must not reuse an on-disk folder (would clobber the prior project).
 * @param {string} absPath
 */
export function assertProductDirFreeForCreate(absPath) {
  const abs = resolve(String(absPath || ""));
  if (!abs) {
    const e = new Error("请填写仓库绝对路径，或项目名（需先设置产品父目录）");
    e.code = "EMPTY_PATH";
    throw e;
  }
  if (existsSync(abs)) {
    const e = new Error(
      `项目目录已存在：${abs}。请换一个目录名，或从「已有项目」打开。`,
    );
    e.code = "PATH_EXISTS";
    e.path = abs;
    throw e;
  }
  return abs;
}

/**
 * Create mode must not reuse a registered project path or display title.
 * @param {{ path: string, title?: string }} want
 * @param {Array<{ path?: string, title?: string, name?: string }>} repos
 */
export function assertProjectIdentityFreeForCreate(want, repos = []) {
  const abs = resolve(String(want?.path || ""));
  const title = String(want?.title || "")
    .trim()
    .toLowerCase();
  const list = Array.isArray(repos) ? repos : [];
  for (const r of list) {
    const p = resolve(String(r?.path || ""));
    if (p && abs && p === abs) {
      const e = new Error(
        `项目已存在：${abs}。请换一个目录名，或从「已有项目」打开。`,
      );
      e.code = "PROJECT_EXISTS";
      e.path = abs;
      throw e;
    }
    const other = String(r?.title || r?.name || "")
      .trim()
      .toLowerCase();
    if (title && other && title === other) {
      const e = new Error(
        `已有同名项目「${r.title || r.name}」。请换一个项目名称，或从「已有项目」打开。`,
      );
      e.code = "TITLE_EXISTS";
      e.path = p || undefined;
      throw e;
    }
  }
  return abs;
}

/**
 * Create missing directory (recursive). Refuses FS root and $HOME itself.
 * @returns {{ path: string, created: boolean, name?: string }}
 */
export function ensureProductDir(absPath, opts = {}) {
  const abs = resolve(String(absPath || ""));
  const home = resolve(opts.home || homedir());
  const root = parse(abs).root;

  if (!abs || abs === root) {
    const e = new Error("不能在磁盘根目录创建项目");
    e.code = "REFUSED_PATH";
    throw e;
  }
  if (abs === home) {
    const e = new Error("不能把用户主目录本身当作项目目录，请指定子目录");
    e.code = "REFUSED_PATH";
    throw e;
  }

  if (existsSync(abs)) {
    if (!statSync(abs).isDirectory()) {
      const e = new Error(`路径已存在但不是目录：${abs}`);
      e.code = "NOT_DIR";
      e.path = abs;
      throw e;
    }
    return { path: abs, created: false, name: basename(abs) || abs };
  }

  mkdirSync(abs, { recursive: true });
  return { path: abs, created: true, name: basename(abs) || abs };
}
