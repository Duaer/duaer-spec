/**
 * Resolve / create product repo directories for live dispatch.
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, parse, resolve } from "node:path";

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
 * Create missing directory (recursive). Refuses FS root and $HOME itself.
 * @returns {{ path: string, created: boolean }}
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
