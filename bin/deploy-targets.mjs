/**
 * Planned hosting targets for live dispatch.
 * Choice drives agent prompts and coding constraints (especially Cloudflare).
 */

export const DEPLOY_TARGETS = [
  {
    id: "none",
    labelZh: "暂不部署",
    labelEn: "No deploy yet",
  },
  {
    id: "cloudflare",
    labelZh: "Cloudflare",
    labelEn: "Cloudflare",
  },
  {
    id: "aliyun",
    labelZh: "阿里云",
    labelEn: "Alibaba Cloud",
  },
  {
    id: "aws",
    labelZh: "AWS",
    labelEn: "AWS",
  },
  {
    id: "github-pages",
    labelZh: "GitHub Pages",
    labelEn: "GitHub Pages",
  },
];

const VALID = new Set(DEPLOY_TARGETS.map((t) => t.id));

export function normalizeDeployTarget(raw) {
  const id = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (VALID.has(id)) return id;
  if (id === "alibaba" || id === "aliyun-oss" || id === "阿里云") return "aliyun";
  if (id === "cf" || id === "workers" || id === "pages") return "cloudflare";
  if (id === "gh-pages" || id === "github" || id === "pages-github") {
    return "github-pages";
  }
  return "none";
}

export function deployTargetMeta(id) {
  const n = normalizeDeployTarget(id);
  return DEPLOY_TARGETS.find((t) => t.id === n) || DEPLOY_TARGETS[0];
}

/** True when a concrete host was chosen (not「暂不部署」). */
export function isDeployPlanned(id) {
  return normalizeDeployTarget(id) !== "none";
}

/**
 * Agent prompt block + Spec note for the chosen target.
 * Cloudflare includes edge runtime coding constraints.
 */
export function deployPromptForTarget(targetId) {
  const id = normalizeDeployTarget(targetId);
  if (id === "none") {
    return {
      needed: false,
      specNote: "",
      promptBlock: `
9. 不要推远程除非用户明确要求
`,
      deployTaskText: null,
      docPath: null,
    };
  }

  if (id === "cloudflare") {
    return {
      needed: true,
      specNote:
        "Planned host: **Cloudflare** (Workers / Pages). Follow `docs/agent/deploy-targets.md` § Cloudflare.",
      promptBlock: `
9. 计划托管：**Cloudflare**（Workers / Pages）。编码从第一天就符合边缘运行时约束（见 worktree 内 duaer-spec 文档 docs/agent/deploy-targets.md）
10. Cloudflare 硬约束：无持久本地文件系统；不要依赖 Node \`fs\` 写盘；优先 Web 标准 Fetch / Request / Response；长任务用 Durable Objects / Queues / Cron，不要假设常驻 Node 进程；密钥用 wrangler secrets / 仪表盘，不要写入仓库
11. 静态站 → Cloudflare Pages；动态 API → Workers（或 Pages Functions）。可用 Wrangler；部署流程写进产品仓 README
12. 部署成功后把公网 URL 写入 delivery.preview.url（label 可用「查看结果」）
13. 用户选了 Cloudflare 即授权本次发布所需的推送 / CLI 操作（仍禁止 force-push 与无关分支）
`,
      deployTaskText:
        "Prepare Cloudflare Pages/Workers layout per deploy-targets.md; document wrangler steps",
      docPath: "docs/agent/deploy-targets.md",
    };
  }

  if (id === "aliyun") {
    return {
      needed: true,
      specNote:
        "Planned host: **Alibaba Cloud (阿里云)**. Follow `docs/agent/deploy-targets.md` § Alibaba Cloud.",
      promptBlock: `
9. 计划托管：**阿里云**。编码与产物符合所选形态（OSS 静态 / 函数计算 FC / SAE 等），见 docs/agent/deploy-targets.md
10. 不要默认改用 Vercel/Netlify；密钥走环境变量 / 密钥管理，不进仓库
11. 在产品仓写明部署步骤（控制台或 CLI）；需要时再接 CI
12. 部署成功后把公网 URL 写入 delivery.preview.url（label 可用「查看结果」）
13. 用户选了阿里云即授权本次发布所需操作（仍禁止 force-push 与无关分支）
`,
      deployTaskText:
        "Prepare Alibaba Cloud deploy shape per deploy-targets.md; document steps",
      docPath: "docs/agent/deploy-targets.md",
    };
  }

  if (id === "aws") {
    return {
      needed: true,
      specNote:
        "Planned host: **AWS**. Follow `docs/agent/deploy-targets.md` § AWS.",
      promptBlock: `
9. 计划托管：**AWS**（常见：S3+CloudFront 静态、Amplify、Lambda/API Gateway）。见 docs/agent/deploy-targets.md
10. 编码符合所选服务约束；密钥用 IAM / Secrets Manager，不进仓库；不要默认改用 Vercel/Netlify
11. 在产品仓写明部署步骤（Console / AWS CLI / SAM / CDK 择一）
12. 部署成功后把公网 URL 写入 delivery.preview.url（label 可用「查看结果」）
13. 用户选了 AWS 即授权本次发布所需操作（仍禁止 force-push 与无关分支）
`,
      deployTaskText:
        "Prepare AWS deploy shape per deploy-targets.md; document steps",
      docPath: "docs/agent/deploy-targets.md",
    };
  }

  // github-pages
  return {
    needed: true,
    specNote:
      "Planned host: **GitHub Pages** via `gh` + Actions. See `docs/agent/deploy-github.md`.",
    promptBlock: `
9. 计划托管：**GitHub Pages**：走 GitHub CLI 自动化部署（\`gh\` + GitHub Actions），不要默认用 Vercel/Netlify 等第三方 CLI
10. 静态站：复制本 worktree 的 .duaer/templates/deploy-github-pages.yml → .github/workflows/deploy.yml（按构建产物改 path）；不要去其它仓找模板
11. \`gh auth status\`；需要时 \`gh repo create\` / 确保 GitHub remote；合并到 main 后 push；\`gh workflow run\` / \`gh run watch\`
12. 部署成功后把公网 URL 写入 delivery.preview.url（label 可用「查看结果」）
13. 用户选了 GitHub Pages 即授权本次发布所需的 push / gh 操作（仍禁止 force-push 与无关分支推送）
`,
    deployTaskText:
      "Deploy with GitHub CLI (`gh`) + Actions；公网 URL 写入 preview.url",
    docPath: "docs/agent/deploy-github.md",
  };
}
