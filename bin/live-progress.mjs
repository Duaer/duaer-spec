/**
 * Live desk progress helpers: detailed tasks.md + worktree activity parsing.
 * Pure functions (no fs/git) so unit tests can import without the live server.
 */

export function truncateText(s, max = 100) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

/** Split Acceptance / revision acceptance into discrete lines. */
export function splitAcceptanceLines(acceptance) {
  const raw = String(acceptance || "").trim();
  if (!raw) return [];
  const lines = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t === "-" || /^\(?none\)?$/i.test(t)) continue;
    const cleaned = t
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)、]\s+/, "")
      .trim();
    if (cleaned) lines.push(cleaned);
  }
  if (lines.length <= 1) {
    const parts = raw
      .split(/[;；]/)
      .map((p) =>
        p
          .replace(/^[-*•]\s+/, "")
          .replace(/^\d+[.)、]\s+/, "")
          .trim(),
      )
      .filter((p) => p && !/^\(?none\)?$/i.test(p));
    if (parts.length > 1) return parts;
  }
  return lines;
}

/**
 * Product dispatch checklist: one checkbox per atomic function / acceptance
 * line. No upper count — split finely; each task must be independently
 * acceptable (do not couple unrelated acceptance into one mega-task).
 */
export function buildDetailedProductTasksMd({
  goal = "",
  acceptance = "",
  deployNeeded = false,
  deployTaskText = null,
} = {}) {
  const acceptLines = splitAcceptanceLines(acceptance);
  const items = [];
  let n = 1;
  const push = (text) => {
    items.push(`- [ ] T${String(n).padStart(3, "0")} ${text}`);
    n += 1;
  };

  const goalShort = truncateText(goal, 80) || "Brief Goal";
  push(`Locate / scaffold entry points for: ${goalShort}`);
  push("Implement core behavior from Goal (single cohesive slice)");
  if (acceptLines.length) {
    for (const a of acceptLines) {
      push(`Satisfy acceptance (alone): ${truncateText(a, 120)}`);
    }
  } else {
    push("Wire UI / API / data needed for Acceptance (one slice)");
    push("Cover one edge case from Assumptions / Acceptance");
  }
  push("Risk-based verification per testing.md");
  push(
    "启动可打开的服务（如 npm start），确认能打开后再 stamp delivery.json accepted，并必须写入 preview.url（页面路径或 http://localhost:…）",
  );
  if (deployNeeded) {
    push(
      deployTaskText ||
        "Deploy with GitHub CLI (`gh`) + Actions；公网 URL 写入 preview.url",
    );
  }
  // Soft floor so the progress column is useful on tiny briefs — not a cap.
  while (items.length < 6) {
    push(`Complete remaining Brief scope (atomic step ${n})`);
  }

  return `# Tasks

${items.join("\n")}

做完一步就立刻把对应项改成 \`- [x]\`，方便 Duaer-spec FED 显示进度。

**拆任务规则（无条数上限）：**
- 每个任务只做一个可独立验收的功能点；不要把多个验收项揉进同一条
- 若清单仍偏粗：开工后先按 Acceptance / Goal 扩成「一条功能一勾选」（仍用 T00x），保存后再做
- 不要为了凑数合并无关步骤；也不要人为卡在 12 条以内

**必须**在 delivery.json 写入 preview（页面或本地/公网服务地址均可）：
\`\`\`json
"preview": { "url": "index.html", "label": "打开看看" }
\`\`\`
或服务：
\`\`\`json
"preview": { "url": "http://localhost:8788", "label": "打开看看" }
\`\`\`
（相对路径相对 worktree 根目录；有公网部署时优先写公网 URL。不要因「没有 index.html」而省略；服务须先启动。）
`;
}

/** Revision-scoped checklist: one R{n}-* box per atomic change / acceptance. */
export function buildDetailedRevisionTasksMd({
  revN,
  change = "",
  acceptance = "",
} = {}) {
  const n = Number(revN) || 1;
  const acceptLines = splitAcceptanceLines(acceptance);
  const items = [];
  let i = 1;
  const push = (text) => {
    items.push(`- [ ] R${n}-${i} ${text}`);
    i += 1;
  };
  push(
    `Apply revision: ${truncateText(change, 140) || "(see Revision block)"}`,
  );
  if (acceptLines.length) {
    for (const a of acceptLines) {
      push(`Satisfy revision acceptance (alone): ${truncateText(a, 120)}`);
    }
  } else {
    push("Wire one change needed for revision acceptance");
  }
  push("Verify against revision acceptance");
  push(
    "启动/更新可打开的服务，并 stamp delivery.json accepted（必须更新 preview.url：页面或 http://localhost:…）",
  );
  while (items.length < 5) {
    push(`Complete remaining revision scope (atomic step ${i})`);
  }
  return items.join("\n");
}

/**
 * Parse git status / diff names into activity for the progress column.
 * @param {{ porcelain?: string, diffNames?: string, limit?: number }} opts
 */
export function parseWorktreeActivityFromGit({
  porcelain = "",
  diffNames = "",
  limit = 10,
} = {}) {
  const files = [];
  const seen = new Set();
  const add = (rel, kind) => {
    let r = String(rel || "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/^"|"$/g, "");
    if (!r || seen.has(r)) return;
    if (
      r.startsWith(".git/") ||
      r.includes("node_modules/") ||
      r.endsWith(".log") ||
      r === "agent-launch.log"
    ) {
      return;
    }
    seen.add(r);
    files.push({ path: r, kind });
  };

  for (const line of String(porcelain || "").split(/\r?\n/)) {
    if (!line.trim() || line.length < 4) continue;
    const xy = line.slice(0, 2);
    let rest = line.slice(3).trim();
    if (rest.includes(" -> ")) rest = rest.split(" -> ").pop().trim();
    const kind = /\?/.test(xy)
      ? "untracked"
      : /D/.test(xy)
        ? "deleted"
        : "modified";
    add(rest, kind);
    if (files.length >= limit) break;
  }

  if (files.length < limit) {
    for (const name of String(diffNames || "").split(/\r?\n/)) {
      add(name, "modified");
      if (files.length >= limit) break;
    }
  }

  const capped = files.slice(0, limit);
  const productish = capped.filter((f) => !f.path.includes(".duaer/"));
  const show = (productish.length ? productish : capped).slice(0, 4);
  const summary = show.length
    ? `改动中：${show.map((f) => f.path).join(" · ")}`
    : "";
  return { files: capped, summary };
}
