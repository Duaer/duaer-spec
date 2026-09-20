/**
 * Project delivery facts for bug (defect) chat — auto-fill, do not re-ask.
 */
import fs from "node:fs";
import path from "node:path";
import {
  inferLocalServiceUrl,
  pickStartCommand,
} from "./live-preview.mjs";

const DELIVERY_FACT_ISSUE_RE =
  /网页地址|具体.*URL|\bURL\b|启动命令|启动脚本|启动方式|运行环境|机器|端口|依赖|疑似原因|线上紧急|是否紧急|生产紧急/i;

/**
 * @param {string} issue
 * @returns {boolean}
 */
export function isBugDeliveryFactIssue(issue) {
  return DELIVERY_FACT_ISSUE_RE.test(String(issue || ""));
}

/**
 * Drop LLM issues that only demand project-delivery facts the desk owns.
 * @param {unknown} issues
 * @returns {string[]}
 */
export function filterBugDeliveryFactIssues(issues) {
  const list = Array.isArray(issues) ? issues : [];
  return list
    .map((x) => String(x || "").trim())
    .filter((x) => x && !isBugDeliveryFactIssue(x));
}

/**
 * Read package.json start-related scripts from a product root.
 * @param {string} projectPath
 * @returns {{ start?: string, dev?: string, serve?: string, preview?: string }}
 */
export function readPackageStartScripts(projectPath) {
  const root = String(projectPath || "").trim();
  const out = {};
  if (!root) return out;
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) return out;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const s = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
    for (const key of ["start", "dev", "serve", "preview"]) {
      if (s[key]) out[key] = String(s[key]);
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * Read `.duaer/handoff.json` restart commands when present.
 * @param {string} projectPath
 * @returns {string[]}
 */
export function readHandoffCommands(projectPath) {
  const root = String(projectPath || "").trim();
  if (!root) return [];
  const file = path.join(root, ".duaer", "handoff.json");
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const cmds = Array.isArray(raw.commands) ? raw.commands : [];
    return cmds
      .map((c) => {
        if (typeof c === "string") return c.trim();
        if (c && typeof c === "object") {
          return String(c.cmd || c.command || "").trim();
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Collect known delivery facts for the active product project.
 * @param {{
 *   projectPath?: string,
 *   previewUrl?: string,
 *   startCommand?: string,
 * }} input
 */
export function collectBugProjectContext(input = {}) {
  const projectPath = String(input.projectPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  const previewFromClient = String(input.previewUrl || "").trim();
  const startCommand = String(input.startCommand || "").trim();
  const scripts = readPackageStartScripts(projectPath);
  const pick = projectPath ? pickStartCommand(projectPath) : null;
  const inferredUrl = projectPath ? inferLocalServiceUrl(projectPath) : null;
  const handoff = readHandoffCommands(projectPath);
  const startLines = [];
  if (pick?.script === "start") startLines.push("npm start");
  else if (pick?.script === "dev") startLines.push("npm run dev");
  else if (pick?.script === "serve") startLines.push("npm run serve");
  for (const [k, v] of Object.entries(scripts)) {
    startLines.push(`npm run ${k} → ${v}`);
  }
  return {
    projectPath: projectPath || null,
    previewUrl: previewFromClient || inferredUrl || null,
    inferredPreviewUrl: inferredUrl || null,
    startCommand: startCommand || null,
    startScripts: scripts,
    startHints: [...new Set(startLines)].slice(0, 6),
    handoffCommands: handoff,
    machine: projectPath ? "local desk host (active project)" : null,
    onlineEmergencyDefault: false,
    suspectedCauseDefault: "待复现定位",
  };
}

/**
 * Human + model readable block for chat follow-up.
 * @param {ReturnType<typeof collectBugProjectContext>} ctx
 */
export function formatBugProjectContextBlock(ctx) {
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const lines = ["【项目交付上下文——已从控制台/交付得知，禁止再向用户追问这些项】"];
  if (c.projectPath) lines.push(`- 仓库路径: ${c.projectPath}`);
  if (c.previewUrl) lines.push(`- 成品/预览地址: ${c.previewUrl}`);
  else if (c.inferredPreviewUrl) {
    lines.push(`- 推断本地服务地址: ${c.inferredPreviewUrl}`);
  } else {
    lines.push("- 成品地址: （交付尚未记录；不要追问用户，assumptions 写「以项目交付预览为准」）");
  }
  if (c.startHints?.length) {
    lines.push(`- 服务启动: ${c.startHints.join("；")}`);
  } else {
    lines.push("- 服务启动: （无 package 脚本时由派工后数字员工按仓库惯例启动；不要追问）");
  }
  if (c.handoffCommands?.length) {
    lines.push(`- handoff 重启: ${c.handoffCommands.join("；")}`);
  }
  if (c.machine) lines.push(`- 运行环境: ${c.machine}`);
  lines.push(
    `- 是否线上紧急: 默认否（从 develop 出 fix/）；仅当用户明确说线上/生产/紧急才标是`,
  );
  lines.push(`- 疑似原因默认: ${c.suspectedCauseDefault || "待复现定位"}（勿当卡点追问）`);
  return lines.join("\n");
}

/**
 * Merge delivery facts into assumptions text.
 * @param {string} assumptions
 * @param {ReturnType<typeof collectBugProjectContext>} ctx
 */
export function enrichBugAssumptions(assumptions, ctx) {
  const base = String(assumptions || "").trim();
  const c = ctx && typeof ctx === "object" ? ctx : {};
  const add = [];
  const has = (re) => re.test(base);
  if (c.previewUrl && !has(/https?:\/\/|预览|成品地址|网页/i)) {
    add.push(`成品地址: ${c.previewUrl}`);
  }
  if (c.startHints?.length && !has(/npm |启动|start|dev/i)) {
    add.push(`启动: ${c.startHints[0]}`);
  }
  if (c.projectPath && !has(/仓库|路径|project/i)) {
    add.push(`仓库: ${c.projectPath}`);
  }
  if (c.machine && !has(/本地|机器|环境/i)) {
    add.push(`环境: ${c.machine}`);
  }
  if (!has(/紧急|hotfix|生产|线上/i)) {
    add.push("线上紧急: 否（默认 develop fix）");
  }
  if (!has(/疑似|原因|定位/i)) {
    add.push(`疑似原因: ${c.suspectedCauseDefault || "待复现定位"}`);
  }
  if (!add.length) return base;
  return base ? `${base}\n${add.join("\n")}` : add.join("\n");
}
