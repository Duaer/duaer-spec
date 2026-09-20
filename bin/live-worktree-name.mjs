/**
 * Allocate feat/ or fix/ branch + .worktree id that do not collide.
 */

export function slugifyBranchPart(text) {
  const ascii = String(text || "job")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (ascii) return ascii;
  return `job-${Date.now().toString(36).slice(-6)}`;
}

/**
 * @param {string} preferredBranch e.g. feat/html or fix/login-crash
 * @param {{
 *   jobId?: string,
 *   kind?: "feat" | "fix",
 *   isTaken: (branch: string, worktreeId: string) => boolean,
 *   max?: number
 * }} opts
 * @returns {{ branch: string, worktreeId: string }}
 */
export function allocateUniqueBranch(preferredBranch, opts = {}) {
  const isTaken =
    typeof opts.isTaken === "function"
      ? opts.isTaken
      : () => {
          throw new Error("isTaken required");
        };
  const max = opts.max ?? 50;
  const jobId = String(opts.jobId || "").trim();
  const rawPreferred = String(preferredBranch || jobId || "job");
  const kind =
    opts.kind === "fix" || rawPreferred.startsWith("fix/")
      ? "fix"
      : "feat";
  const prefix = kind;
  const raw = rawPreferred.replace(/^feat\//, "").replace(/^fix\//, "");
  const baseSlug = slugifyBranchPart(raw).slice(0, 36) || "job";
  const jobNum = jobId.match(/^(\d{3})/)?.[1];
  const candidates = [
    `${prefix}/${baseSlug}`,
    jobNum ? `${prefix}/${baseSlug}-${jobNum}` : null,
    jobId ? `${prefix}/${slugifyBranchPart(jobId).slice(0, 40)}` : null,
  ].filter(Boolean);

  for (let n = 2; n <= max; n += 1) {
    candidates.push(`${prefix}/${baseSlug}-${n}`);
  }

  const seen = new Set();
  for (const branch of candidates) {
    if (seen.has(branch)) continue;
    seen.add(branch);
    const worktreeId = branch.replace(/\//g, "-");
    if (isTaken(branch, worktreeId)) continue;
    return { branch, worktreeId };
  }
  throw new Error(
    `无法分配新的派工分支（${preferredBranch || baseSlug} 冲突过多）`,
  );
}

/**
 * @deprecated Prefer allocateUniqueBranch with kind: "feat"
 */
export function allocateUniqueFeatBranch(preferredBranch, opts = {}) {
  return allocateUniqueBranch(preferredBranch, { ...opts, kind: "feat" });
}
