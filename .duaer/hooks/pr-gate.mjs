/**
 * PR + CI merge gate. Opt-in per project with `.duaer/memory/pr.json`
 * (`{ "enabled": true, "base": "develop" }`). When on, a job stamped accepted
 * only counts once its GitHub PR is merged. Uses the `gh` CLI; no dependencies,
 * copied into product repos by `duaer init`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const PR_CONFIG_REL = path.join(".duaer", "memory", "pr.json");
export const MAX_CI_ROUNDS = 3;

const FAILED = new Set([
  "FAILURE",
  "ERROR",
  "CANCELLED",
  "TIMED_OUT",
  "ACTION_REQUIRED",
  "STARTUP_FAILURE",
]);

export function readPrConfig(repoRoot) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(repoRoot, PR_CONFIG_REL), "utf8"));
    if (raw?.enabled !== true) return null;
    return { base: String(raw.base || "develop").trim() || "develop" };
  } catch {
    return null;
  }
}

function checkName(c) {
  return String(c?.name || c?.context || "check");
}

/** CheckRun uses status/conclusion; StatusContext uses state. */
function checkState(c) {
  if (c?.__typename === "StatusContext" || (c?.state && !c?.status)) {
    const s = String(c.state || "").toUpperCase();
    if (FAILED.has(s)) return "fail";
    return s === "SUCCESS" ? "pass" : "pending";
  }
  if (String(c?.status || "").toUpperCase() !== "COMPLETED") return "pending";
  return FAILED.has(String(c?.conclusion || "").toUpperCase()) ? "fail" : "pass";
}

/**
 * Pure: `gh pr view --json …` + `gh run list --json headSha,conclusion` → state.
 * @returns {{ result: "none"|"closed"|"pending"|"fail"|"changes"|"ready"|"merged"|"stuck", url: string, failing: string[], round: number }}
 */
export function parsePrState(pr, runs = []) {
  if (!pr) return { result: "none", url: "", failing: [], round: 0 };
  const url = String(pr.url || "");
  const failedHeads = new Set(
    (Array.isArray(runs) ? runs : [])
      .filter((r) => FAILED.has(String(r?.conclusion || "").toUpperCase()))
      .map((r) => r.headSha),
  );
  const out = { url, failing: [], round: failedHeads.size };
  const state = String(pr.state || "").toUpperCase();
  if (state === "MERGED") return { ...out, result: "merged" };
  if (state === "CLOSED") return { ...out, result: "closed" };
  const checks = Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : [];
  const failing = checks.filter((c) => checkState(c) === "fail").map(checkName);
  if (failing.length) {
    return { ...out, failing, result: out.round >= MAX_CI_ROUNDS ? "stuck" : "fail" };
  }
  if (String(pr.reviewDecision || "").toUpperCase() === "CHANGES_REQUESTED") {
    return { ...out, result: "changes" };
  }
  if (checks.some((c) => checkState(c) === "pending")) return { ...out, result: "pending" };
  return { ...out, result: "ready" };
}

function gh(repoRoot, args) {
  return spawnSync("gh", args, { cwd: repoRoot, encoding: "utf8", timeout: 20_000 });
}

/**
 * Looks the PR up by `url` (from delivery.json `pr.url`) or by the open PR of
 * head `branch`. A url whose head branch is not the job branch counts as no PR.
 */
export function prStatus(repoRoot, { url = "", branch = "" } = {}) {
  let ref = url;
  if (!ref && branch) {
    // By branch only an open PR counts: a revision reuses the branch name, and
    // the last revision's merged PR must not pass for it. Merged counts via pr.url.
    const open = gh(repoRoot, ["pr", "list", "--head", branch, "--state", "open", "--json", "url", "-L", "1"]);
    if (open.error || open.status !== 0) {
      const why = open.error ? open.error.message : (open.stderr || "").trim().split("\n")[0];
      return { result: "error", url: "", failing: [], round: 0, error: why || "gh failed" };
    }
    try {
      ref = JSON.parse(open.stdout)[0]?.url || "";
    } catch {
      ref = "";
    }
  }
  if (!ref) return { result: "none", url: "", failing: [], round: 0 };
  const view = gh(repoRoot, [
    "pr",
    "view",
    ref,
    "--json",
    "url,state,headRefName,reviewDecision,statusCheckRollup",
  ]);
  if (view.error || view.status !== 0) {
    if (/no pull requests? found/i.test(view.stderr || "")) {
      return { result: "none", url: "", failing: [], round: 0 };
    }
    const why = view.error ? view.error.message : (view.stderr || "").trim().split("\n")[0];
    return { result: "error", url: "", failing: [], round: 0, error: why || "gh failed" };
  }
  let pr;
  try {
    pr = JSON.parse(view.stdout);
  } catch {
    return { result: "error", url: "", failing: [], round: 0, error: "gh returned bad JSON" };
  }
  if (branch && pr.headRefName && pr.headRefName !== branch) {
    return { result: "none", url: "", failing: [], round: 0 };
  }
  const list = gh(repoRoot, [
    "run",
    "list",
    "--branch",
    String(pr.headRefName || branch),
    "--json",
    "headSha,conclusion",
    "-L",
    "100",
  ]);
  let runs = [];
  try {
    runs = list.status === 0 ? JSON.parse(list.stdout) : [];
  } catch {
    runs = [];
  }
  return parsePrState(pr, runs);
}

export function prPasses(status) {
  return status.result === "merged";
}

export function prReason(status) {
  switch (status.result) {
    case "none":
      return "no PR yet";
    case "closed":
      return `PR closed without merge (${status.url})`;
    case "pending":
      return `CI running (${status.url})`;
    case "fail":
      return `CI failed round ${status.round}: ${status.failing.join(", ")}`;
    case "changes":
      return `PR has Request changes (${status.url})`;
    case "ready":
      return `PR green but not merged (${status.url})`;
    case "stuck":
      return `CI still failing after ${MAX_CI_ROUNDS} rounds (needs a human)`;
    case "error":
      return `cannot read PR state: ${status.error || "gh failed"}`;
    default:
      return "";
  }
}

export function prInstructions(featureDir, status, { base = "develop", branch = "" } = {}) {
  const delivery = path.join(featureDir, "delivery.json");
  const steps = {
    none: [
      `git push -u origin ${branch || "<branch>"}`,
      `gh pr create --base ${base} --title "<goal>" --body "<Brief goal + acceptance, then review.md>"`,
      "gh pr checks --watch, then follow the result.",
    ],
    closed: ["Reopen the PR (gh pr reopen) or open a new one, then gh pr checks --watch."],
    pending: ["gh pr checks --watch, then follow the result."],
    fail: [
      "gh run view --log-failed for each failed check; add each cause as a \"- [ ]\" task in tasks.md.",
      `Fix, commit, push, gh pr checks --watch again (max ${MAX_CI_ROUNDS} CI rounds).`,
    ],
    changes: [
      "gh pr view --comments; verify each requested change before acting; add the sound ones as \"- [ ]\" tasks.",
      "Fix, commit, push, reply on the PR, gh pr checks --watch.",
    ],
    ready: [
      "gh pr merge --merge --delete-branch",
      `Sync local ${base} in the primary checkout (git pull --ff-only), then hand off the worktree.`,
    ],
    error: ["Check gh is installed and logged in (gh auth status); retry."],
  }[status.result] || [];
  return [
    `Duaer PR gate: delivery.json says accepted, but ${prReason(status)}.`,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    `Set ${delivery} status "open" until the PR is merged; then stamp accepted with "pr": { "url": "<PR url>" }.`,
  ].join("\n");
}
