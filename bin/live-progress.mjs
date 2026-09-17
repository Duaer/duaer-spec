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
 * Default product dispatch checklist (≥6 boxes).
 * Agents may expand further; live desk polls these checkboxes for progress.
 */
export function buildDetailedProductTasksMd({
  goal = "",
  acceptance = "",
  deployNeeded = false,
} = {}) {
  const acceptLines = splitAcceptanceLines(acceptance).slice(0, 6);
  const items = [];
  let n = 1;
  const push = (text) => {
    items.push(`- [ ] T${String(n).padStart(3, "0")} ${text}`);
    n += 1;
  };

  const goalShort = truncateText(goal, 80) || "Brief Goal";
  push(`Locate / scaffold entry points for: ${goalShort}`);
  push("Implement core behavior from Goal");
  if (acceptLines.length) {
    for (const a of acceptLines) {
      push(`Satisfy acceptance: ${truncateText(a, 100)}`);
    }
  } else {
    push("Wire UI / API / data needed for Acceptance");
    push("Cover edge cases from Assumptions / Acceptance");
  }
  push("Risk-based verification per testing.md");
  push(
    "Stamp delivery.json accepted（若有可打开成品，写入 preview.url）",
  );
  if (deployNeeded) {
    push(
      "Deploy with GitHub CLI (`gh`) + Actions；公网 URL 写入 preview.url",
    );
  }
  while (items.length < 6) {
    push(`Complete remaining Brief scope (step ${n})`);
  }

  return `# Tasks

${items.join("\n")}

做完一步就立刻把对应项改成 \`- [x]\`，方便 Duaer-spec FED 显示进度。
若清单仍偏粗，开工后先扩成 8–15 条可勾选步骤（仍用 T00x），保存后再做。

若交付物是页面/静态文件，在 delivery.json 增加：
\`\`\`json
"preview": { "url": "index.html", "label": "查看成品" }
\`\`\`
（也可用 http(s) 地址；相对路径相对 worktree 根目录；若已 GitHub Pages 部署，优先写公网 URL）
`;
}

/** Revision-scoped checklist (≥5 R{n}-* boxes). */
export function buildDetailedRevisionTasksMd({
  revN,
  change = "",
  acceptance = "",
} = {}) {
  const n = Number(revN) || 1;
  const acceptLines = splitAcceptanceLines(acceptance).slice(0, 4);
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
      push(`Satisfy revision acceptance: ${truncateText(a, 100)}`);
    }
  } else {
    push("Wire changes needed for revision acceptance");
  }
  push("Verify against revision acceptance");
  push("Stamp delivery.json accepted（更新 preview.url）");
  while (items.length < 5) {
    push(`Complete remaining revision scope (step ${i})`);
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
