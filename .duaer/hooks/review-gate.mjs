#!/usr/bin/env node
/**
 * Ponytail review gate. A job stamped accepted only counts when the Brief's
 * review.md says `Verdict: Ship.` for the current code. Shared by
 * `duaer check` / `duaer job`, the FDE desk, and the agent stop hooks:
 *
 *   node .duaer/hooks/review-gate.mjs claude   # Claude Code Stop hook
 *   node .duaer/hooks/review-gate.mjs cursor   # Cursor stop hook
 *
 * No dependencies: this file is copied into product repos by `duaer init`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REVIEW_FILE = "review.md";
export const MAX_ROUNDS = 2;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function parseReview(text) {
  const body = String(text || "");
  const verdicts = [...body.matchAll(/^\W*Verdict:\W*(.+)$/gim)];
  const last = verdicts.length ? verdicts[verdicts.length - 1][1].trim() : "";
  const ship = last
    ? /^ship\b/i.test(last)
    : /^\W*Looks good\. Ship\./im.test(body);
  const round = Number((body.match(/^\W*Round:\W*(\d+)/im) || [])[1] || 1);
  const commit = (body.match(/^\W*Commit:\W*([0-9a-f]{7,40})\b/im) || [])[1] || "";
  return { ship, verdict: last || (ship ? "Ship." : ""), round, commit };
}

/** Exit 0 = code outside .duaer/ unchanged since commit; null = not a git checkout. */
function codeMatches(repoRoot, commit) {
  const inside = spawnSync("git", ["-C", repoRoot, "rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
  });
  if (inside.status !== 0) return null;
  if (!commit) return false;
  const r = spawnSync(
    "git",
    ["-C", repoRoot, "diff", "--quiet", commit, "--", ".", ":(exclude).duaer"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return false;
  // Untracked files are part of the change too.
  const u = spawnSync(
    "git",
    ["-C", repoRoot, "ls-files", "--others", "--exclude-standard", "--", ".", ":(exclude).duaer"],
    { encoding: "utf8" },
  );
  return u.status === 0 && !u.stdout.trim();
}

/**
 * @returns {{ result: "pass"|"waived"|"missing"|"fix"|"stale"|"stuck", round: number, verdict: string, commit?: string }}
 * stuck = still failing after MAX_ROUNDS; a human decides next.
 */
export function reviewStatus(featureDir, repoRoot) {
  const verify = readJson(path.join(repoRoot, ".duaer", "memory", "verify.json"));
  const hasCommands = Array.isArray(verify?.commands) && verify.commands.some((c) => String(c).trim());
  if (!hasCommands && verify?.waiver === "docs-only") {
    return { result: "waived", round: 0, verdict: "" };
  }
  const file = path.join(featureDir, REVIEW_FILE);
  if (!fs.existsSync(file)) return { result: "missing", round: 0, verdict: "" };
  const review = parseReview(fs.readFileSync(file, "utf8"));
  const out = { round: review.round, verdict: review.verdict, commit: review.commit };
  if (!review.ship) {
    return { ...out, result: review.round >= MAX_ROUNDS ? "stuck" : "fix" };
  }
  if (codeMatches(repoRoot, review.commit) === false) return { ...out, result: "stale" };
  return { ...out, result: "pass" };
}

export function reviewPasses(status) {
  return status.result === "pass" || status.result === "waived";
}

export function reviewReason(status) {
  switch (status.result) {
    case "missing":
      return `no ${REVIEW_FILE} (run ponytail-review)`;
    case "fix":
      return `review round ${status.round}: ${status.verdict || "not Ship"}`;
    case "stale":
      return "code changed after review (review again)";
    case "stuck":
      return `review still failing after ${MAX_ROUNDS} rounds (needs a human)`;
    default:
      return "";
  }
}

export function reviewInstructions(featureDir, status) {
  const rel = path.join(featureDir, REVIEW_FILE);
  // A stale or missing review starts a new cycle (e.g. a revision after Ship).
  const next = status.result === "fix" ? status.round + 1 : 1;
  return [
    `Duaer review gate: delivery.json says accepted, but ${reviewReason(status)}.`,
    `1. Commit the work. Run the ponytail-review skill on the job diff against the integration branch.`,
    `2. Write ${rel}: first lines \`Round: ${next}\` and \`Commit: <git rev-parse HEAD>\`, then the full report.`,
    `3. Verdict not Ship: set delivery.json status to "open", add each Must fix item as a "- [ ]" task in tasks.md, fix them, then review again (max ${MAX_ROUNDS} rounds).`,
    `Should fix / Nice to have are recorded only. Do not claim done until the verdict is Ship.`,
  ].join("\n");
}

/** Jobs that claim accepted in the project and its live worktrees. */
export function claimedJobs(projectDir) {
  const roots = [projectDir];
  const wt = path.join(projectDir, ".worktree");
  try {
    for (const name of fs.readdirSync(wt)) roots.push(path.join(wt, name));
  } catch {
    // no worktrees
  }
  const jobs = [];
  for (const root of roots) {
    const active = readJson(path.join(root, ".duaer", "active-job.json"));
    if (!active?.feature) continue;
    const featureDir = path.join(root, ".duaer", "specs", String(active.feature));
    const delivery = readJson(path.join(featureDir, "delivery.json"));
    if (delivery?.status !== "accepted") continue;
    jobs.push({ root, featureDir, status: reviewStatus(featureDir, root) });
  }
  return jobs;
}

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function main(host) {
  const input = readStdin();
  const projectDir =
    process.env.CLAUDE_PROJECT_DIR ||
    (Array.isArray(input.workspace_roots) && input.workspace_roots[0]) ||
    input.cwd ||
    process.cwd();
  // One forced retry per stop; the CLI verdict keeps the job unaccepted after that.
  if (host === "claude" && input.stop_hook_active) return;
  if (host === "cursor" && Number(input.loop_count || 0) >= MAX_ROUNDS) return;
  const failing = claimedJobs(projectDir).filter(
    (j) => !reviewPasses(j.status) && j.status.result !== "stuck",
  );
  if (!failing.length) return;
  const message = failing.map((j) => reviewInstructions(j.featureDir, j.status)).join("\n\n");
  const out =
    host === "cursor"
      ? { followup_message: message }
      : { decision: "block", reason: message };
  process.stdout.write(`${JSON.stringify(out)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv[2] === "cursor" ? "cursor" : "claude");
  } catch {
    // Never break the agent session on a gate bug; the CLI verdict still holds.
  }
}
