#!/usr/bin/env node
/**
 * norm — CLI for the Norm delivery OS (digital employees)
 *
 * Everyday:  norm init | norm status
 * Advanced:  check | job | policy | version
 */

import './legacy-names-init.mjs'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkForUpdate,
  formatUpdateHint,
  localPackageVersion,
  maybePrintUpdateHint,
  runSelfUpdate,
} from './update-check.mjs'
import { jobGate } from '../.norm/hooks/review-gate.mjs'
import { migrateLegacyRepo } from './legacy-names.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'))

const POLICY_MODES = new Set(['off', 'coach', 'strict'])

const USAGE = `norm — digital-employee delivery (Norm ${PKG.version})

Install:  npx @fujiezee/norm init --here
Update:   npx @fujiezee/norm update          # product-repo adapters
          npm i -g @fujiezee/norm@latest     # bootstrap / upgrade global CLI
          norm self-update              # same as npm i -g (0.13+)

Then talk to the agent in plain language.

Also:
  norm live [--port N]              Open Norm FDE (isolated ~/.norm/live)
  norm live config --provider deepseek --api-key …
  norm live config --base-url … --api-key … --model …
  norm live repo add [path]         Remember a product repo for dispatch (default: cwd)
  norm handoff [--run]   Restart services on develop after worktree remove
  norm status | check | policy | version | self-update | upgrade | help

Init options: --all | --method | --ops | --force | --branch <n> | --here
`

function parseArgs(argv) {
  const args = argv.slice(2)
  const out = {
    cmd: args[0] || 'help',
    dir: '.',
    mode: 'all',
    force: false,
    branch: 'develop',
    workplace: false,
    delivery: false,
    job: false,
    allJobs: false,
    strict: false,
    policyMode: null,
    run: false,
    modeExplicit: false,
    port: null,
    liveConfig: false,
    liveRepoAdd: false,
    baseUrl: null,
    apiKey: null,
    model: null,
    provider: null,
    repoPath: null,
  }
  const rest = args.slice(1)
  // norm live config …  |  norm live repo add …
  if (out.cmd === 'live' && rest[0] === 'config') {
    out.liveConfig = true
    rest.shift()
  } else if (out.cmd === 'live' && rest[0] === 'repo' && rest[1] === 'add') {
    out.liveRepoAdd = true
    rest.shift()
    rest.shift()
    if (rest[0] && !rest[0].startsWith('-')) {
      out.repoPath = rest.shift()
    }
  }
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--all') {
      out.mode = 'all'
      out.modeExplicit = true
    } else if (a === '--method') {
      out.mode = 'method'
      out.modeExplicit = true
    } else if (a === '--ops') {
      out.mode = 'ops'
      out.modeExplicit = true
    } else if (a === '--force') out.force = true
    else if (a === '--here') out.dir = '.'
    else if (a === '--workplace') out.workplace = true
    else if (a === '--delivery') out.delivery = true
    else if (a === '--job') out.job = true
    else if (a === '--all-jobs') out.allJobs = true
    else if (a === '--strict' || a === '--gate') out.strict = true
    else if (a === '--run') out.run = true
    else if (a === '--port') {
      out.port = rest[++i]
      if (!out.port) throw new Error('--port requires a value')
    } else if (a === '--provider') {
      out.provider = rest[++i]
      if (out.provider == null) throw new Error('--provider requires a value')
    } else if (a === '--base-url') {
      out.baseUrl = rest[++i]
      if (out.baseUrl == null) throw new Error('--base-url requires a value')
    } else if (a === '--api-key') {
      out.apiKey = rest[++i]
      if (out.apiKey == null) throw new Error('--api-key requires a value')
    } else if (a === '--model') {
      out.model = rest[++i]
      if (out.model == null) throw new Error('--model requires a value')
    } else if (a === '--branch') {
      out.branch = rest[++i]
      if (!out.branch) throw new Error('--branch requires a value')
    } else if (POLICY_MODES.has(a) && out.cmd === 'policy') {
      out.policyMode = a
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`)
    } else if (out.cmd === 'policy' && POLICY_MODES.has(a)) {
      out.policyMode = a
    } else if (out.liveRepoAdd && out.repoPath == null) {
      out.repoPath = a
    } else if (!out.liveConfig && !out.liveRepoAdd) {
      out.dir = a
    }
  }
  return out
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true })
}

function copyPath(from, to, { force, skipNames }) {
  if (!existsSync(from)) {
    throw new Error(`Package missing required path: ${from}`)
  }
  const srcIsDir = statSync(from).isDirectory()
  if (srcIsDir) {
    ensureDir(to)
    for (const name of readdirSync(from)) {
      if (skipNames?.has(name)) continue
      copyPath(join(from, name), join(to, name), { force })
    }
    return { skipped: false, merged: true }
  }
  if (
    existsSync(to) &&
    basename(to) === 'verify.json' &&
    basename(dirname(to)) === 'memory'
  ) {
    console.log(`skip (keep): ${to}`)
    return { skipped: true }
  }
  if (existsSync(to) && !force) {
    console.log(`skip (exists): ${to}  (use --force to overwrite)`)
    return { skipped: true }
  }
  ensureDir(dirname(to))
  cpSync(from, to, { force: true })
  return { skipped: false }
}

function writeIfNeeded(path, content, { force }) {
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}  (use --force to overwrite)`)
    return
  }
  ensureDir(dirname(path))
  writeFileSync(path, content, 'utf8')
  console.log(`wrote ${path}`)
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function defaultPolicy() {
  return {
    schemaVersion: 1,
    mode: 'coach',
    scope: 'active',
    notes:
      'Job-level handoff. off=record only; coach=guide (default); strict=do not claim done until accepted. Not a git merge lock.',
  }
}

function policyPath(target) {
  return join(target, '.norm', 'delivery-policy.json')
}

function activeJobPath(target) {
  return join(target, '.norm', 'active-job.json')
}

function loadPolicy(target) {
  const p = readJson(policyPath(target), null)
  if (!p) return defaultPolicy()
  const mode = POLICY_MODES.has(p.mode) ? p.mode : 'coach'
  return { ...defaultPolicy(), ...p, mode }
}

function writePolicy(target, mode) {
  const next = { ...defaultPolicy(), mode, updatedAt: new Date().toISOString() }
  ensureDir(join(target, '.norm'))
  writeFileSync(policyPath(target), JSON.stringify(next, null, 2) + '\n')
  return next
}

function writeDefaultPolicy(target, { force }) {
  const path = policyPath(target)
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}`)
    return
  }
  writeFileSync(path, JSON.stringify(defaultPolicy(), null, 2) + '\n')
  console.log('  .norm/delivery-policy.json (mode=coach)')
}

function defaultHandoff() {
  return {
    schemaVersion: 1,
    onWorktreeRemove: {
      stop:
        'Stop any process whose working directory is under the request worktree (dev servers, file watchers, local APIs).',
      restartFromPrimary: true,
      commands: [],
    },
    notes:
      'After merging into develop, stop worktree processes, remove .worktree/<id>, then restart from the primary checkout. Add commands such as "npm run dev" when needed.',
  }
}

function writeDefaultHandoff(target, { force }) {
  const path = join(target, '.norm', 'handoff.json')
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}`)
    return
  }
  ensureDir(dirname(path))
  writeFileSync(path, JSON.stringify(defaultHandoff(), null, 2) + '\n')
  console.log('  .norm/handoff.json')
}

/** Job history of this package. Adopters start their own specs directory. */
const PACKAGED_PROGRESS = new Set(['specs', 'active-job.json'])

function installMethod(target, opts) {
  console.log('Installing Norm method…')
  copyPath(join(PKG_ROOT, '.norm'), join(target, '.norm'), {
    ...opts,
    skipNames: PACKAGED_PROGRESS,
  })
  ensureDir(join(target, '.norm', 'specs'))
  console.log('  .norm/ (method; empty specs/)')
  writeDefaultPolicy(target, opts)
  writeDefaultHandoff(target, opts)

  installCursorMethod(target, opts)
  installClaudeMethod(target, opts)
  installCodexMethod(target, opts)
  installReviewHooks(target)

  copyPath(join(PKG_ROOT, 'NORM.md'), join(target, 'NORM.md'), opts)
  console.log('  NORM.md')
  ensureWorktreeGitignore(target)
}

function mirrorNormSkills(target, skillsDir, opts, label) {
  ensureDir(skillsDir)
  const skillsRoot = join(PKG_ROOT, '.cursor', 'skills')
  for (const name of readdirSync(skillsRoot)) {
    if (!name.startsWith('norm-')) continue
    copyPath(join(skillsRoot, name), join(skillsDir, name), opts)
  }
  console.log(`  ${label}`)
}

function installCursorMethod(target, opts) {
  mirrorNormSkills(target, join(target, '.cursor', 'skills'), opts, '.cursor/skills/norm-*')
  installPackagedSkills(target, '.cursor', opts)

  ensureDir(join(target, '.cursor', 'rules'))
  copyPath(
    join(PKG_ROOT, '.cursor', 'rules', 'norm.mdc'),
    join(target, '.cursor', 'rules', 'norm.mdc'),
    opts,
  )
  console.log('  .cursor/rules/norm.mdc')
}

// Packaged non-norm skills (Ponytail) live under .claude/skills and go to every skill host.
function installPackagedSkills(target, hostDir, opts) {
  const srcRoot = join(PKG_ROOT, '.claude', 'skills')
  if (!existsSync(srcRoot)) return
  for (const name of readdirSync(srcRoot).sort()) {
    const src = join(srcRoot, name)
    if (!statSync(src).isDirectory()) continue
    if (!existsSync(join(src, 'SKILL.md'))) continue
    copyPath(src, join(target, hostDir, 'skills', name), opts)
    console.log(`  ${hostDir}/skills/${name}`)
  }
}

const REVIEW_HOOK = '.norm/hooks/review-gate.mjs'

// Merge one hook entry into a host's JSON config; keep everything already there.
function mergeHookConfig(file, label, add) {
  let config = {}
  if (existsSync(file)) {
    try {
      config = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      console.log(`skip (unreadable JSON, add the review hook by hand): ${file}`)
      return
    }
  }
  if (JSON.stringify(config).includes(REVIEW_HOOK)) {
    console.log(`  ${label} (review hook present)`)
    return
  }
  add(config)
  ensureDir(dirname(file))
  writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8')
  console.log(`  ${label} ← review stop hook`)
}

function installReviewHooks(target) {
  mergeHookConfig(join(target, '.claude', 'settings.json'), '.claude/settings.json', (c) => {
    c.hooks ??= {}
    c.hooks.Stop ??= []
    c.hooks.Stop.push({
      hooks: [{ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/${REVIEW_HOOK}" claude` }],
    })
  })
  mergeHookConfig(join(target, '.cursor', 'hooks.json'), '.cursor/hooks.json', (c) => {
    c.version ??= 1
    c.hooks ??= {}
    c.hooks.stop ??= []
    c.hooks.stop.push({ command: `node ${REVIEW_HOOK} cursor` })
  })
}

const HOOK_FILES = ['.claude/settings.json', REVIEW_HOOK, '.norm/hooks/pr-gate.mjs']

/**
 * Hook files that a request worktree would miss: not in git yet, or changed
 * since the last commit. Empty outside a git checkout.
 */
function uncommittedHookFiles(target) {
  const r = spawnSync('git', ['-C', target, 'status', '--porcelain', '--', ...HOOK_FILES], {
    encoding: 'utf8',
  })
  if (r.status !== 0) return []
  return r.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
}

function hookCommitReminder(target) {
  const files = uncommittedHookFiles(target)
  if (!files.length) return
  console.log(`
Review hooks are not committed yet. Request worktrees branch from git, so
they only get the hooks once these are committed:
  git add ${files.join(' ')}
  git commit -m "chore(norm): add review gate hooks"`)
}

/** Warnings only: a missing or uncommitted hook weakens the gate but is not a broken install. */
function checkReviewHooks(target) {
  if (!existsSync(join(target, REVIEW_HOOK))) return // ops-only install: no hook to check
  const settings = join(target, '.claude', 'settings.json')
  if (!existsSync(settings) || !readFileSync(settings, 'utf8').includes(REVIEW_HOOK)) {
    console.log('warn .claude/settings.json has no review stop hook — run: norm update')
  }
  for (const file of uncommittedHookFiles(target)) {
    console.log(`warn ${file} not committed — request worktrees will not run the review hook`)
  }
}

function installClaudeMethod(target, opts) {
  mirrorNormSkills(
    target,
    join(target, '.claude', 'skills'),
    opts,
    '.claude/skills/norm-*  (mirrored from .cursor/skills)',
  )
  installPackagedSkills(target, '.claude', opts)

  ensureDir(join(target, '.claude', 'rules'))
  const claudeRule = join(PKG_ROOT, '.claude', 'rules', 'norm.md')
  if (existsSync(claudeRule)) {
    copyPath(claudeRule, join(target, '.claude', 'rules', 'norm.md'), opts)
  } else {
    writeIfNeeded(
      join(target, '.claude', 'rules', 'norm.md'),
      cursorRuleToClaude(
        readFileSync(join(PKG_ROOT, '.cursor', 'rules', 'norm.mdc'), 'utf8'),
        '.claude',
      ),
      opts,
    )
  }
  console.log('  .claude/rules/norm.md')

  const claudeMdSrc = join(PKG_ROOT, 'CLAUDE.md')
  if (existsSync(claudeMdSrc)) {
    copyPath(claudeMdSrc, join(target, 'CLAUDE.md'), opts)
  } else {
    writeIfNeeded(join(target, 'CLAUDE.md'), defaultClaudeMd(), opts)
  }
  console.log('  CLAUDE.md')
}

function installCodexMethod(target, opts) {
  // Codex discovers repo skills under .agents/skills (not .codex/skills).
  // Always-on guidance is AGENTS.md (installed with ops).
  mirrorNormSkills(
    target,
    join(target, '.agents', 'skills'),
    opts,
    '.agents/skills/norm-*  (Codex; mirrored from .cursor/skills)',
  )
  installPackagedSkills(target, '.agents', opts)
}

function stripRuleComment(md) {
  return md.replace(/^<!--[\s\S]*?-->\s*/, '').trim()
}

function withYamlFrontmatter(body, lines) {
  return `---\n${lines.join('\n')}\n---\n\n${stripRuleComment(body)}\n`
}

function loadPackagedRule(name) {
  const claudePath = join(PKG_ROOT, '.claude', 'rules', name)
  if (existsSync(claudePath)) return readFileSync(claudePath, 'utf8')
  const mdc = name.replace(/\.md$/, '.mdc')
  return cursorRuleToClaude(readFileSync(join(PKG_ROOT, '.cursor', 'rules', mdc), 'utf8'), '.claude')
}

function genericHostRuleBody(name) {
  let body = loadPackagedRule(name)
  body = body.replaceAll(
    '.claude/skills/norm-do/SKILL.md',
    'AGENTS.md § Autonomous job loop (and `.agents/skills/norm-do/SKILL.md` when present)',
  )
  body = body.replaceAll('.claude/skills/', '.agents/skills/')
  return body
}

function defaultGeminiMd() {
  return `# GEMINI.md — Norm

This project uses **Norm**: coding agents are digital employees.

**Precedence:** \`AGENTS.md\` (ops) wins over \`NORM.md\` / \`.norm/\` (method).

- Follow \`AGENTS.md\` § Autonomous job loop
- Job skill (when available): \`.agents/skills/norm-do/SKILL.md\`
- Branches / worktrees: \`docs/agent/branching-and-release.md\`
`
}

function defaultCopilotInstructions() {
  return `# GitHub Copilot — Norm

Treat agents as **digital employees**. Humans state intent; you run Brief → work → accept.

**Precedence:** \`AGENTS.md\` > \`NORM.md\` / \`.norm/\`

1. Isolate on \`feat|fix/<name>\` under \`.worktree/feat-<name>/\` (never name the worktree after \`.norm/specs/<nnn-slug>/\`).
2. Follow \`AGENTS.md\` § Autonomous job loop (skill: \`.agents/skills/norm-do/SKILL.md\` when present).
3. Do not ask the human to operate slash commands or phase names.
4. One handoff line; never claim done unless \`delivery.json\` is \`accepted\`.

See also: \`NORM.md\`, \`docs/agent/branching-and-release.md\`.
`
}

function defaultAiderConf() {
  return `# Norm — point Aider at the shared agent contract
read: [AGENTS.md, NORM.md]
`
}

function installRuleSet(target, relDir, names, frontmatterLines, opts, label) {
  const dir = join(target, ...relDir.split('/'))
  ensureDir(dir)
  for (const name of names) {
    const dest = join(dir, name)
    if (existsSync(dest) && !opts.force) {
      console.log(`skip (exists): ${dest}  (use --force to overwrite)`)
      continue
    }
    const body = genericHostRuleBody(name)
    const content = frontmatterLines?.length
      ? withYamlFrontmatter(body, frontmatterLines)
      : `${stripRuleComment(body)}\n`
    ensureDir(dirname(dest))
    writeFileSync(dest, content, 'utf8')
  }
  console.log(`  ${label}`)
}

function installExtraHosts(target, opts) {
  console.log('Installing common host adapters…')

  // GitHub Copilot
  ensureDir(join(target, '.github'))
  writeIfNeeded(
    join(target, '.github', 'copilot-instructions.md'),
    defaultCopilotInstructions(),
    opts,
  )
  console.log('  .github/copilot-instructions.md')

  // Gemini CLI
  const geminiSrc = join(PKG_ROOT, 'GEMINI.md')
  if (existsSync(geminiSrc)) {
    copyPath(geminiSrc, join(target, 'GEMINI.md'), opts)
  } else {
    writeIfNeeded(join(target, 'GEMINI.md'), defaultGeminiMd(), opts)
  }
  console.log('  GEMINI.md')

  // Aider
  writeIfNeeded(join(target, '.aider.conf.yml'), defaultAiderConf(), opts)
  console.log('  .aider.conf.yml')

  const ruleNames = ['norm.md', 'agents-workflow.md', 'ai-ui-copy.md']

  // Windsurf (Cascade) + Devin Desktop
  installRuleSet(
    target,
    '.windsurf/rules',
    ruleNames,
    ['trigger: always_on'],
    opts,
    '.windsurf/rules/*',
  )
  installRuleSet(
    target,
    '.devin/rules',
    ruleNames,
    ['trigger: always_on'],
    opts,
    '.devin/rules/*',
  )

  // Cline
  installRuleSet(target, '.clinerules', ruleNames, null, opts, '.clinerules/*')

  // Continue.dev
  installRuleSet(
    target,
    '.continue/rules',
    ruleNames,
    ['alwaysApply: true'],
    opts,
    '.continue/rules/*',
  )
}

function cursorRuleToClaude(mdc, skillHost) {
  let body = mdc.replace(/^---\n[\s\S]*?\n---\n+/, (fm) => {
    const desc = (fm.match(/^description:\s*(.+)$/m) || [])[1]
    return desc ? `<!-- ${desc.trim()} -->\n\n` : ''
  })
  body = body.replaceAll('.cursor/skills/', `${skillHost}/skills/`)
  return body.trimEnd() + '\n'
}

function defaultClaudeMd() {
  return `# CLAUDE.md — Norm

This project uses **Norm**: coding agents are digital employees.

**Precedence:** \`AGENTS.md\` (ops) wins over \`NORM.md\` / \`.norm/\` (method).

- Follow \`.claude/rules/\`
- Job loop: \`.claude/skills/norm-do/SKILL.md\` (no slash commands required)
- Branches / worktrees: see \`AGENTS.md\` and \`docs/agent/branching-and-release.md\`
`
}

function ensureWorktreeGitignore(target) {
  const gi = join(target, '.gitignore')
  const line = '.worktree/'
  let text = existsSync(gi) ? readFileSync(gi, 'utf8') : ''
  if (text.split(/\r?\n/).some((l) => l.trim() === line)) {
    console.log('  .gitignore already ignores .worktree/')
    return
  }
  if (text.length && !text.endsWith('\n')) text += '\n'
  text += `# Norm: mandatory request worktrees (do not commit)\n${line}\n`
  writeFileSync(gi, text, 'utf8')
  console.log('  .gitignore ← .worktree/')
}

function installOps(target, opts) {
  console.log('Installing agent ops…')
  copyPath(join(PKG_ROOT, 'AGENTS.md'), join(target, 'AGENTS.md'), opts)
  console.log('  AGENTS.md')

  ensureDir(join(target, '.cursor', 'rules'))
  for (const name of ['agents-workflow.mdc', 'ai-ui-copy.mdc']) {
    copyPath(
      join(PKG_ROOT, '.cursor', 'rules', name),
      join(target, '.cursor', 'rules', name),
      opts,
    )
  }
  console.log('  .cursor/rules/agents-workflow.mdc, ai-ui-copy.mdc')

  ensureDir(join(target, '.claude', 'rules'))
  for (const name of ['agents-workflow.md', 'ai-ui-copy.md']) {
    const src = join(PKG_ROOT, '.claude', 'rules', name)
    if (existsSync(src)) {
      copyPath(src, join(target, '.claude', 'rules', name), opts)
    } else {
      const mdc = name.replace(/\.md$/, '.mdc')
      writeIfNeeded(
        join(target, '.claude', 'rules', name),
        cursorRuleToClaude(readFileSync(join(PKG_ROOT, '.cursor', 'rules', mdc), 'utf8'), '.claude'),
        opts,
      )
    }
  }
  console.log('  .claude/rules/agents-workflow.md, ai-ui-copy.md')

  ensureDir(join(target, 'docs', 'agent'))
  for (const name of [
    'workflow.md',
    'change-checklist.md',
    'e2e-test-plan.md',
    'branching-and-release.md',
    'README.md',
  ]) {
    copyPath(
      join(PKG_ROOT, 'docs', 'agent', name),
      join(target, 'docs', 'agent', name),
      opts,
    )
  }
  console.log('  docs/agent/')
  ensureWorktreeGitignore(target)

  const baselineSrc = join(PKG_ROOT, 'docs', 'baseline.md')
  const baselineDst = join(target, 'docs', 'baseline.md')
  if (!existsSync(baselineDst) || opts.force) {
    let text = readFileSync(baselineSrc, 'utf8')
    text = text.replace(
      /\*\*Norm itself:\*\*[^\n]*/,
      `**This project:** integration branch \`${opts.branch}\`; replace frozen decisions below.`,
    )
    if (!text.includes('Integration branch')) {
      text += `\n\n## Integration branch\n\n\`${opts.branch}\`\n`
    } else {
      text = text.replace(/Integration branch[^\n]*/i, `Integration branch: \`${opts.branch}\``)
    }
    writeIfNeeded(baselineDst, text, opts)
  } else {
    console.log(`skip (exists): ${baselineDst}`)
  }
}

function writeInitMarker(target, opts) {
  const marker = join(target, '.norm', 'norm-init.json')
  ensureDir(dirname(marker))
  const payload = {
    version: PKG.version,
    installedAt: new Date().toISOString(),
    mode: opts.mode,
    branch: opts.branch,
    source: "norm",
  }
  writeFileSync(marker, JSON.stringify(payload, null, 2) + '\n')
  console.log('  .norm/norm-init.json')
}

function reportLegacyMigration(target) {
  if (!existsSync(target)) return
  const moved = migrateLegacyRepo(target)
  if (!moved.length) return
  console.log('Renamed duaer-spec install to Norm:')
  for (const line of moved) console.log(`  ${line}`)
  console.log('')
}

function cmdInit(opts) {
  const target = resolve(opts.dir)
  reportLegacyMigration(target)
  if (!existsSync(target)) {
    ensureDir(target)
  }
  if (!statSync(target).isDirectory()) {
    throw new Error(`Not a directory: ${target}`)
  }

  console.log(`Target: ${target}`)
  console.log(`Mode:   ${opts.mode}`)
  console.log(`Branch: ${opts.branch}`)
  console.log('')

  if (opts.mode === 'all' || opts.mode === 'method') {
    installMethod(target, opts)
  }
  if (opts.mode === 'all' || opts.mode === 'ops') {
    installOps(target, opts)
  }
  if (opts.mode === 'all' || opts.mode === 'method' || opts.mode === 'ops') {
    installExtraHosts(target, opts)
  }
  if (opts.mode === 'all' || opts.mode === 'method') {
    writeInitMarker(target, opts)
  }

  console.log(`
Hired.

Talk to the agent in plain language (Cursor, Claude, Codex, Copilot, and more).
Later update:  npx @fujiezee/norm update
`)
  if (opts.mode === 'all' || opts.mode === 'method') hookCommitReminder(target)
}

function cmdUpdate(opts) {
  const target = resolve(opts.dir)
  reportLegacyMigration(target)
  const marker = readJson(join(target, '.norm', 'norm-init.json'), null)
  if (!marker && !existsSync(join(target, '.norm')) && !existsSync(join(target, 'NORM.md'))) {
    console.log('No norm install found here. Use: npx @fujiezee/norm init --here')
    process.exitCode = 1
    return
  }

  if (!opts.modeExplicit && marker?.mode && ['all', 'method', 'ops'].includes(marker.mode)) {
    opts.mode = marker.mode
  }
  if (marker?.branch) opts.branch = marker.branch
  opts.force = true

  console.log(`Updating → ${PKG.version}`)
  cmdInit(opts)
  console.log(`
Updated.
If you customized constitution / baseline / handoff commands, check git diff once.
`)
}

function countOpenTasks(tasksPath) {
  if (!existsSync(tasksPath)) return null
  const text = readFileSync(tasksPath, 'utf8')
  const open = (text.match(/^\s*-\s*\[\s\]/gm) || []).length
  const done = (text.match(/^\s*-\s*\[x\]/gim) || []).length
  return { open, done }
}

function readDelivery(path) {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return { status: 'invalid', error: 'unreadable delivery.json' }
  }
}

function featureVerdict(name, dir) {
  const specPath = join(dir, 'spec.md')
  const tasksPath = join(dir, 'tasks.md')
  const deliveryPath = join(dir, 'delivery.json')
  const tasks = countOpenTasks(tasksPath)
  const delivery = readDelivery(deliveryPath)
  const hasSpec = existsSync(specPath)
  const stamp = delivery?.status || 'none'
  let verdict = 'accepted'
  const blockers = []

  if (!hasSpec) {
    verdict = 'blocked'
    blockers.push('missing spec.md')
  }
  if (tasks && tasks.open > 0) {
    verdict = 'blocked'
    blockers.push(`${tasks.open} open task(s)`)
  }
  if (stamp === 'open' || stamp === 'invalid') {
    verdict = 'blocked'
    blockers.push(`delivery.json status=${stamp}`)
  }
  if (hasSpec && tasks && tasks.open === 0 && (stamp === 'none' || !delivery)) {
    verdict = 'unaccepted'
    blockers.push('no delivery.json (run /norm-converge)')
  }
  if (hasSpec && !tasks && (stamp === 'none' || !delivery)) {
    verdict = 'unaccepted'
    blockers.push('no tasks.md / no delivery.json')
  }
  if (stamp === 'accepted' && tasks && tasks.open === 0 && hasSpec) {
    verdict = 'accepted'
    blockers.length = 0
  } else if (stamp === 'accepted' && (!tasks || tasks.open === 0) && hasSpec && !tasks) {
    // accepted stamp with no tasks file — treat as accepted only if stamp says so
    // keep unaccepted path above for !tasks && no stamp
  }

  // Stamp accepted but open tasks remain → blocked (fake stamp)
  if (stamp === 'accepted' && tasks && tasks.open > 0) {
    verdict = 'blocked'
    blockers.length = 0
    blockers.push('delivery.json accepted but open tasks remain')
  }

  return { name, hasSpec, tasks, stamp, verdict, blockers }
}

function listFeatures(target) {
  const root = join(target, '.norm', 'specs')
  if (!existsSync(root)) return []
  return readdirSync(root)
    .filter((name) => {
      try {
        return statSync(join(root, name)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()
    .map((name) => featureVerdict(name, join(root, name)))
}

// The review / PR gate applies to the active job only, so jobs accepted
// before the gate existed keep their stamp in --all-jobs listings.
function withReviewGate(target, feature) {
  if (!feature || feature.verdict !== 'accepted') return feature
  const branch = String(readJson(activeJobPath(target), null)?.branch || '')
  const gate = jobGate(join(target, '.norm', 'specs', feature.name), target, { branch })
  if (gate.ok) return feature
  return { ...feature, verdict: 'unaccepted', blockers: [gate.reason] }
}

function resolveActiveJobName(target, features) {
  const marker = readJson(activeJobPath(target), null)
  if (marker?.feature && features.some((f) => f.name === marker.feature)) {
    return marker.feature
  }
  if (features.length === 0) return null
  // Prefer newest directory name (lexicographic works for NNN-slug)
  return features[features.length - 1].name
}

function printFeature(f, { label } = {}) {
  const taskInfo = f.tasks
    ? `tasks open=${f.tasks.open} done=${f.tasks.done}`
    : 'no tasks.md'
  const prefix = label ? `${label} ` : ''
  console.log(
    `${prefix}${f.verdict.padEnd(10)} ${f.name}  spec=${f.hasSpec ? 'yes' : 'NO'}  stamp=${f.stamp}  ${taskInfo}`,
  )
  for (const b of f.blockers) console.log(`           · ${b}`)
}

function checkWorkplace(target) {
  const checks = [
    ['.norm/memory/constitution.md', 'method'],
    ['.norm/memory/testing.md', 'method'],
    ['NORM.md', 'method'],
    ['.cursor/rules/norm.mdc', 'method'],
    ['.cursor/skills/norm-specify/SKILL.md', 'method'],
    ['.claude/rules/norm.md', 'method'],
    ['.claude/skills/norm-do/SKILL.md', 'method'],
    ['.claude/skills/ponytail/SKILL.md', 'method'],
    ['.claude/skills/ponytail-review/SKILL.md', 'method'],
    ['.norm/hooks/review-gate.mjs', 'method'],
    ['.agents/skills/norm-do/SKILL.md', 'method'],
    ['CLAUDE.md', 'method'],
    ['GEMINI.md', 'method'],
    ['.github/copilot-instructions.md', 'method'],
    ['.windsurf/rules/norm.md', 'method'],
    ['.clinerules/norm.md', 'method'],
    ['.continue/rules/norm.md', 'method'],
    ['.aider.conf.yml', 'method'],
    ['AGENTS.md', 'ops'],
    ['.cursor/rules/agents-workflow.mdc', 'ops'],
    ['.claude/rules/agents-workflow.md', 'ops'],
    ['docs/agent/workflow.md', 'ops'],
  ]
  let missing = 0
  console.log('## Workplace\n')
  for (const [rel, kind] of checks) {
    const ok = existsSync(join(target, rel))
    console.log(`${ok ? 'ok ' : 'MISS'}  [${kind}] ${rel}`)
    if (!ok) missing++
  }
  return missing
}

function checkDelivery(target, { allJobs, policy }) {
  const listed = listFeatures(target)
  const activeName = resolveActiveJobName(target, listed)
  const features = listed.map((f) =>
    f.name === activeName ? withReviewGate(target, f) : f,
  )
  const active = features.find((f) => f.name === activeName) || null

  console.log('\n## Handoff (jobs)\n')
  console.log(`policy: ${policy.mode}  scope: ${allJobs ? 'all' : 'active'}`)

  if (features.length === 0) {
    console.log('ok   no features under .norm/specs/ (nothing to hand off)')
    return { blocked: 0, unaccepted: 0, features: 0, active: null, unfinished: false }
  }

  if (allJobs) {
    for (const f of features) {
      printFeature(f, { label: f.name === activeName ? '★' : ' ' })
    }
  } else if (active) {
    printFeature(active, { label: '★' })
    console.log(`\nactive job: ${active.name}  (from .norm/active-job.json or latest spec)`)
  } else {
    console.log('ok   no resolvable active job')
  }

  const focus = allJobs ? features : active ? [active] : []
  let blocked = 0
  let unaccepted = 0
  for (const f of focus) {
    if (f.verdict === 'blocked') blocked++
    if (f.verdict === 'unaccepted') unaccepted++
  }
  const unfinished = blocked + unaccepted > 0
  return { blocked, unaccepted, features: focus.length, active, unfinished }
}

function handoffAdvice(policy, unfinished, strictFlag) {
  if (!unfinished) {
    console.log('\nActive job accepted — employee may report delivery complete.')
    return
  }
  if (policy.mode === 'off' && !strictFlag) {
    console.log('\nHandoff incomplete (policy=off) — recorded only.')
    return
  }
  if (policy.mode === 'coach' && !strictFlag) {
    console.log(`
Coach: this job is not accepted yet.
  → close open tasks, run /norm-converge, then norm job .
  → do not tell the user the work is "done" until status=accepted
  → git is not blocked; this is job etiquette, not a merge lock
`)
    return
  }
  console.log(`
Strict: active job not accepted — exit 1.
  → /norm-converge until delivery.json status=accepted and tasks clear
`)
}

function cmdCheck(opts) {
  const target = resolve(opts.dir)
  const policy = loadPolicy(target)
  const strictFlag = opts.strict || policy.mode === 'strict'

  // default: workplace + delivery; --workplace alone; job/delivery/strict/all-jobs → delivery
  let wp = false
  let del = false
  if (opts.workplace && !opts.delivery && !opts.job && !opts.allJobs && !opts.strict) {
    wp = true
  } else if (opts.delivery || opts.job || opts.allJobs || opts.strict) {
    del = true
    if (opts.workplace) wp = true
  } else {
    wp = true
    del = true
  }

  console.log(`Checking ${target}${strictFlag ? ' (strict handoff)' : ''}\n`)

  let workplaceMissing = 0
  if (wp) {
    workplaceMissing = checkWorkplace(target)
    checkReviewHooks(target)
  }

  let delivery = { unfinished: false }
  if (del) {
    delivery = checkDelivery(target, { allJobs: opts.allJobs, policy })
  }

  let fail = false
  if (workplaceMissing) {
    console.log(`\n${workplaceMissing} workplace file(s) missing — run: norm init ${opts.dir} --all`)
    fail = true
  }

  if (del) {
    handoffAdvice(policy, delivery.unfinished, opts.strict)
    if (delivery.unfinished && strictFlag) {
      fail = true
    }
  }

  if (!fail) {
    if (wp && !workplaceMissing && !del) {
      console.log('\nWorkplace ready.')
    } else if (!delivery.unfinished) {
      console.log('\nCheck ok.')
    } else {
      console.log('\nCheck ok (handoff still open under coach/off — see above).')
    }
  } else {
    process.exitCode = 1
  }
}

function cmdJob(opts) {
  const target = resolve(opts.dir)
  const policy = loadPolicy(target)
  const features = listFeatures(target)
  const activeName = resolveActiveJobName(target, features)
  const active = withReviewGate(target, features.find((f) => f.name === activeName) || null)

  console.log(`Status @ ${target}`)
  if (!active) {
    console.log('No active job yet. In Cursor run: /norm-do <what you want>')
    return
  }
  if (active.verdict === 'accepted') {
    console.log(`✅ accepted  ${active.name}`)
    console.log('Ready for your review.')
  } else {
    console.log(`⏳ not done  ${active.name}`)
    for (const b of active.blockers) console.log(`   · ${b}`)
    console.log('Next: /norm-do (resume) or /norm-converge')
  }
  if (policy.mode === 'strict' && active.verdict !== 'accepted') {
    console.log('(policy=strict — do not claim done yet)')
  }
}

function cmdPolicy(opts) {
  const target = resolve(opts.dir)
  if (opts.policyMode) {
    if (!POLICY_MODES.has(opts.policyMode)) {
      throw new Error(`Unknown policy mode: ${opts.policyMode}`)
    }
    const next = writePolicy(target, opts.policyMode)
    console.log(`Wrote ${policyPath(target)}`)
    console.log(`mode: ${next.mode}`)
    return
  }
  const policy = loadPolicy(target)
  const exists = existsSync(policyPath(target))
  console.log(`Policy @ ${target}`)
  console.log(`file:  ${exists ? policyPath(target) : '(defaults; run init or: norm policy . coach)'}`)
  console.log(`mode:  ${policy.mode}`)
  console.log(`scope: ${policy.scope || 'active'}`)
  console.log(`
Modes:
  off     record only
  coach   guide; do not claim done until accepted (default)
  strict  check fails + agents must not report done until accepted
Not a git merge lock.
`)
}

function cmdHandoff(opts) {
  const target = resolve(opts.dir)
  const cfg = readJson(join(target, '.norm', 'handoff.json'), defaultHandoff())
  const block = cfg.onWorktreeRemove || {}
  const commands = Array.isArray(block.commands) ? block.commands.filter(Boolean) : []

  console.log(`Handoff @ ${target}`)
  console.log('(worktree → merged develop / hotfix main)\n')
  console.log('1. Confirm request branch is merged into develop (hotfix: main + back-merge develop)')
  console.log(`2. Stop: ${block.stop || defaultHandoff().onWorktreeRemove.stop}`)
  console.log('3. git worktree remove .worktree/<id>  &&  git branch -d feat|fix/<name>')
  console.log('4. Restart from primary checkout on the merged branch:\n')

  if (!commands.length) {
    console.log('   (no commands in .norm/handoff.json)')
    console.log('   Add e.g. "npm run dev" under onWorktreeRemove.commands')
    console.log('   If you started a server in the worktree, re-run that same command here.')
  } else {
    for (const c of commands) console.log(`   $ ${c}`)
  }

  if (opts.run) {
    if (!commands.length) {
      console.log('\n--run: nothing to start (commands empty).')
      return
    }
    console.log('')
    for (const c of commands) {
      const child = spawn(c, {
        shell: true,
        cwd: target,
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      console.log(`started (detached) pid=${child.pid}: ${c}`)
    }
    console.log('\nServices should now be bound to the primary checkout, not .worktree/.')
  } else if (commands.length) {
    console.log('\nTip: norm handoff --run   # start the commands above in the background')
  }
}

function cmdLive(opts) {
  const script = join(PKG_ROOT, 'bin', 'norm-live.mjs')
  if (!existsSync(script)) {
    throw new Error('norm-live.mjs missing from package')
  }
  // Isolated desk: do NOT pass the user's cwd as a project root for serve/config.
  const args = [script]
  if (opts.liveRepoAdd) {
    args.push('repo', 'add')
    const target = opts.repoPath || resolve(opts.dir || '.')
    args.push(target)
  } else if (opts.liveConfig) {
    args.push('config')
    if (opts.provider) args.push('--provider', opts.provider)
    if (opts.baseUrl) args.push('--base-url', opts.baseUrl)
    if (opts.apiKey) args.push('--api-key', opts.apiKey)
    if (opts.model) args.push('--model', opts.model)
  } else if (opts.port) {
    args.push('--port', String(opts.port))
  }
  void maybePrintUpdateHint()
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    cwd: opts.liveRepoAdd ? resolve(opts.dir || '.') : PKG_ROOT,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

async function cmdVersion() {
  console.log(localPackageVersion())
  const info = await checkForUpdate({ force: true })
  if (info.latest) {
    console.log(
      `npm latest: ${info.latest}${info.outdated ? ' (update available)' : ''}`,
    )
  }
  const line = formatUpdateHint(info)
  if (line) console.log(line)
}

function main() {
  let opts
  try {
    opts = parseArgs(process.argv)
  } catch (e) {
    console.error(e.message)
    console.error(USAGE)
    process.exit(1)
  }

  try {
    switch (opts.cmd) {
      case 'init':
        void maybePrintUpdateHint()
        cmdInit(opts)
        break
      case 'update':
        void maybePrintUpdateHint()
        cmdUpdate(opts)
        break
      case 'self-update':
      case 'selfupdate':
      case 'upgrade':
        runSelfUpdate()
        break
      case 'live':
        cmdLive(opts)
        break
      case 'check':
        void maybePrintUpdateHint()
        cmdCheck(opts)
        break
      case 'handoff':
        cmdHandoff(opts)
        break
      case 'job':
      case 'status':
        void maybePrintUpdateHint()
        cmdJob(opts)
        break
      case 'policy':
        cmdPolicy(opts)
        break
      case 'version':
      case '--version':
      case '-v':
        void cmdVersion().catch((e) => {
          console.log(localPackageVersion())
          console.error(e instanceof Error ? e.message : e)
        })
        break
      case 'help':
      case '--help':
      case '-h':
        console.log(USAGE)
        void maybePrintUpdateHint()
        break
      default:
        console.error(`Unknown command: ${opts.cmd}\n`)
        if (/self[-_]?update|upgrade/i.test(String(opts.cmd || ""))) {
          console.error(
            "This CLI build is too old for self-update. Bootstrap once:\n  npm i -g @fujiezee/norm@latest\nThen: norm self-update\n",
          )
        } else {
          console.error(
            "Tip: upgrade the global CLI with:\n  npm i -g @fujiezee/norm@latest\n",
          )
        }
        console.log(USAGE)
        process.exit(1)
    }
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }
}

main()
