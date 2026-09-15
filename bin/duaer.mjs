#!/usr/bin/env node
/**
 * duaer — CLI for the duaer-spec delivery OS (digital employees)
 *
 * Everyday:  duaer init | duaer status
 * Advanced:  check | job | policy | version
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'))

const POLICY_MODES = new Set(['off', 'coach', 'strict'])

const USAGE = `duaer — digital-employee delivery (duaer-spec ${PKG.version})

Install:  npx duaer-spec init --here
Update:   npx duaer-spec update

Then talk to the agent in plain language.

Also:
  duaer live [--port N]   Open 现场开发 web (dialogue → confirm → Brief)
  duaer handoff [--run]   Restart services on develop after worktree remove
  duaer status | check | policy | version | help

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
  }
  const rest = args.slice(1)
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
    } else if (a === '--branch') {
      out.branch = rest[++i]
      if (!out.branch) throw new Error('--branch requires a value')
    } else if (POLICY_MODES.has(a) && out.cmd === 'policy') {
      out.policyMode = a
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`)
    } else if (out.cmd === 'policy' && POLICY_MODES.has(a)) {
      out.policyMode = a
    } else {
      out.dir = a
    }
  }
  return out
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true })
}

function copyPath(from, to, { force }) {
  if (!existsSync(from)) {
    throw new Error(`Package missing required path: ${from}`)
  }
  if (existsSync(to) && !force) {
    const st = statSync(to)
    if (st.isDirectory()) {
      for (const name of readdirSync(from)) {
        copyPath(join(from, name), join(to, name), { force })
      }
      return { skipped: false, merged: true }
    }
    console.log(`skip (exists): ${to}  (use --force to overwrite)`)
    return { skipped: true }
  }
  ensureDir(dirname(to))
  cpSync(from, to, { recursive: true, force: true })
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
  return join(target, '.duaer', 'delivery-policy.json')
}

function activeJobPath(target) {
  return join(target, '.duaer', 'active-job.json')
}

function loadPolicy(target) {
  const p = readJson(policyPath(target), null)
  if (!p) return defaultPolicy()
  const mode = POLICY_MODES.has(p.mode) ? p.mode : 'coach'
  return { ...defaultPolicy(), ...p, mode }
}

function writePolicy(target, mode) {
  const next = { ...defaultPolicy(), mode, updatedAt: new Date().toISOString() }
  ensureDir(join(target, '.duaer'))
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
  console.log('  .duaer/delivery-policy.json (mode=coach)')
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
  const path = join(target, '.duaer', 'handoff.json')
  if (existsSync(path) && !force) {
    console.log(`skip (exists): ${path}`)
    return
  }
  ensureDir(dirname(path))
  writeFileSync(path, JSON.stringify(defaultHandoff(), null, 2) + '\n')
  console.log('  .duaer/handoff.json')
}

function installMethod(target, opts) {
  console.log('Installing Duaer method…')
  copyPath(join(PKG_ROOT, '.duaer'), join(target, '.duaer'), opts)
  console.log('  .duaer/')
  writeDefaultPolicy(target, opts)
  writeDefaultHandoff(target, opts)

  installCursorMethod(target, opts)
  installClaudeMethod(target, opts)
  installCodexMethod(target, opts)

  copyPath(join(PKG_ROOT, 'DUADER.md'), join(target, 'DUADER.md'), opts)
  console.log('  DUADER.md')
  ensureWorktreeGitignore(target)
}

function mirrorDuaerSkills(target, skillsDir, opts, label) {
  ensureDir(skillsDir)
  const skillsRoot = join(PKG_ROOT, '.cursor', 'skills')
  for (const name of readdirSync(skillsRoot)) {
    if (!name.startsWith('duaer-')) continue
    copyPath(join(skillsRoot, name), join(skillsDir, name), opts)
  }
  console.log(`  ${label}`)
}

function installCursorMethod(target, opts) {
  mirrorDuaerSkills(target, join(target, '.cursor', 'skills'), opts, '.cursor/skills/duaer-*')

  ensureDir(join(target, '.cursor', 'rules'))
  copyPath(
    join(PKG_ROOT, '.cursor', 'rules', 'duaer-spec.mdc'),
    join(target, '.cursor', 'rules', 'duaer-spec.mdc'),
    opts,
  )
  console.log('  .cursor/rules/duaer-spec.mdc')
}

function installClaudeMethod(target, opts) {
  mirrorDuaerSkills(
    target,
    join(target, '.claude', 'skills'),
    opts,
    '.claude/skills/duaer-*  (mirrored from .cursor/skills)',
  )

  ensureDir(join(target, '.claude', 'rules'))
  const claudeRule = join(PKG_ROOT, '.claude', 'rules', 'duaer-spec.md')
  if (existsSync(claudeRule)) {
    copyPath(claudeRule, join(target, '.claude', 'rules', 'duaer-spec.md'), opts)
  } else {
    writeIfNeeded(
      join(target, '.claude', 'rules', 'duaer-spec.md'),
      cursorRuleToClaude(
        readFileSync(join(PKG_ROOT, '.cursor', 'rules', 'duaer-spec.mdc'), 'utf8'),
        '.claude',
      ),
      opts,
    )
  }
  console.log('  .claude/rules/duaer-spec.md')

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
  mirrorDuaerSkills(
    target,
    join(target, '.agents', 'skills'),
    opts,
    '.agents/skills/duaer-*  (Codex; mirrored from .cursor/skills)',
  )
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
    '.claude/skills/duaer-do/SKILL.md',
    'AGENTS.md § Autonomous job loop (and `.agents/skills/duaer-do/SKILL.md` when present)',
  )
  body = body.replaceAll('.claude/skills/', '.agents/skills/')
  return body
}

function defaultGeminiMd() {
  return `# GEMINI.md — duaer-spec

This project uses **duaer-spec**: coding agents are digital employees.

**Precedence:** \`AGENTS.md\` (ops) wins over \`DUADER.md\` / \`.duaer/\` (method).

- Follow \`AGENTS.md\` § Autonomous job loop
- Job skill (when available): \`.agents/skills/duaer-do/SKILL.md\`
- Branches / worktrees: \`docs/agent/branching-and-release.md\`
`
}

function defaultCopilotInstructions() {
  return `# GitHub Copilot — duaer-spec

Treat agents as **digital employees**. Humans state intent; you run Brief → work → accept.

**Precedence:** \`AGENTS.md\` > \`DUADER.md\` / \`.duaer/\`

1. Isolate on \`feat|fix/<name>\` under \`.worktree/feat-<name>/\` (never name the worktree after \`.duaer/specs/<nnn-slug>/\`).
2. Follow \`AGENTS.md\` § Autonomous job loop (skill: \`.agents/skills/duaer-do/SKILL.md\` when present).
3. Do not ask the human to operate slash commands or phase names.
4. One handoff line; never claim done unless \`delivery.json\` is \`accepted\`.

See also: \`DUADER.md\`, \`docs/agent/branching-and-release.md\`.
`
}

function defaultAiderConf() {
  return `# duaer-spec — point Aider at the shared agent contract
read: [AGENTS.md, DUADER.md]
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

  const ruleNames = ['duaer-spec.md', 'agents-workflow.md', 'ai-ui-copy.md']

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
  return `# CLAUDE.md — duaer-spec

This project uses **duaer-spec**: coding agents are digital employees.

**Precedence:** \`AGENTS.md\` (ops) wins over \`DUADER.md\` / \`.duaer/\` (method).

- Follow \`.claude/rules/\`
- Job loop: \`.claude/skills/duaer-do/SKILL.md\` (no slash commands required)
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
  text += `# duaer-spec: mandatory request worktrees (do not commit)\n${line}\n`
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
      /\*\*duaer-spec itself:\*\*[^\n]*/,
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
  const marker = join(target, '.duaer', 'duaer-init.json')
  ensureDir(dirname(marker))
  const payload = {
    version: PKG.version,
    installedAt: new Date().toISOString(),
    mode: opts.mode,
    branch: opts.branch,
    source: 'duaer-spec',
  }
  writeFileSync(marker, JSON.stringify(payload, null, 2) + '\n')
  console.log('  .duaer/duaer-init.json')
}

function cmdInit(opts) {
  const target = resolve(opts.dir)
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
Later update:  npx duaer-spec update
`)
}

function cmdUpdate(opts) {
  const target = resolve(opts.dir)
  const marker = readJson(join(target, '.duaer', 'duaer-init.json'), null)
  if (!marker && !existsSync(join(target, '.duaer')) && !existsSync(join(target, 'DUADER.md'))) {
    console.log('No duaer install found here. Use: npx duaer-spec init --here')
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
    blockers.push('no delivery.json (run /duaer-converge)')
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
  const root = join(target, '.duaer', 'specs')
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
    ['.duaer/memory/constitution.md', 'method'],
    ['.duaer/memory/testing.md', 'method'],
    ['DUADER.md', 'method'],
    ['.cursor/rules/duaer-spec.mdc', 'method'],
    ['.cursor/skills/duaer-specify/SKILL.md', 'method'],
    ['.claude/rules/duaer-spec.md', 'method'],
    ['.claude/skills/duaer-do/SKILL.md', 'method'],
    ['.agents/skills/duaer-do/SKILL.md', 'method'],
    ['CLAUDE.md', 'method'],
    ['GEMINI.md', 'method'],
    ['.github/copilot-instructions.md', 'method'],
    ['.windsurf/rules/duaer-spec.md', 'method'],
    ['.clinerules/duaer-spec.md', 'method'],
    ['.continue/rules/duaer-spec.md', 'method'],
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
  const features = listFeatures(target)
  const activeName = resolveActiveJobName(target, features)
  const active = features.find((f) => f.name === activeName) || null

  console.log('\n## Handoff (jobs)\n')
  console.log(`policy: ${policy.mode}  scope: ${allJobs ? 'all' : 'active'}`)

  if (features.length === 0) {
    console.log('ok   no features under .duaer/specs/ (nothing to hand off)')
    return { blocked: 0, unaccepted: 0, features: 0, active: null, unfinished: false }
  }

  if (allJobs) {
    for (const f of features) {
      printFeature(f, { label: f.name === activeName ? '★' : ' ' })
    }
  } else if (active) {
    printFeature(active, { label: '★' })
    console.log(`\nactive job: ${active.name}  (from .duaer/active-job.json or latest spec)`)
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
  → close open tasks, run /duaer-converge, then duaer job .
  → do not tell the user the work is "done" until status=accepted
  → git is not blocked; this is job etiquette, not a merge lock
`)
    return
  }
  console.log(`
Strict: active job not accepted — exit 1.
  → /duaer-converge until delivery.json status=accepted and tasks clear
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
  if (wp) workplaceMissing = checkWorkplace(target)

  let delivery = { unfinished: false }
  if (del) {
    delivery = checkDelivery(target, { allJobs: opts.allJobs, policy })
  }

  let fail = false
  if (workplaceMissing) {
    console.log(`\n${workplaceMissing} workplace file(s) missing — run: duaer init ${opts.dir} --all`)
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
  const active = features.find((f) => f.name === activeName) || null

  console.log(`Status @ ${target}`)
  if (!active) {
    console.log('No active job yet. In Cursor run: /duaer-do <what you want>')
    return
  }
  if (active.verdict === 'accepted') {
    console.log(`✅ accepted  ${active.name}`)
    console.log('Ready for your review.')
  } else {
    console.log(`⏳ not done  ${active.name}`)
    for (const b of active.blockers) console.log(`   · ${b}`)
    console.log('Next: /duaer-do (resume) or /duaer-converge')
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
  console.log(`file:  ${exists ? policyPath(target) : '(defaults; run init or: duaer policy . coach)'}`)
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
  const cfg = readJson(join(target, '.duaer', 'handoff.json'), defaultHandoff())
  const block = cfg.onWorktreeRemove || {}
  const commands = Array.isArray(block.commands) ? block.commands.filter(Boolean) : []

  console.log(`Handoff @ ${target}`)
  console.log('(worktree → merged develop / hotfix main)\n')
  console.log('1. Confirm request branch is merged into develop (hotfix: main + back-merge develop)')
  console.log(`2. Stop: ${block.stop || defaultHandoff().onWorktreeRemove.stop}`)
  console.log('3. git worktree remove .worktree/<id>  &&  git branch -d feat|fix/<name>')
  console.log('4. Restart from primary checkout on the merged branch:\n')

  if (!commands.length) {
    console.log('   (no commands in .duaer/handoff.json)')
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
    console.log('\nTip: duaer handoff --run   # start the commands above in the background')
  }
}

function cmdLive(opts) {
  const target = resolve(opts.dir)
  const script = join(PKG_ROOT, 'bin', 'duaer-live.mjs')
  if (!existsSync(script)) {
    throw new Error('duaer-live.mjs missing from package')
  }
  const args = [script, target]
  if (opts.port) args.push('--port', String(opts.port))
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    cwd: target,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
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
        cmdInit(opts)
        break
      case 'update':
        cmdUpdate(opts)
        break
      case 'live':
        cmdLive(opts)
        break
      case 'check':
        cmdCheck(opts)
        break
      case 'handoff':
        cmdHandoff(opts)
        break
      case 'job':
      case 'status':
        cmdJob(opts)
        break
      case 'policy':
        cmdPolicy(opts)
        break
      case 'version':
      case '--version':
      case '-v':
        console.log(PKG.version)
        break
      case 'help':
      case '--help':
      case '-h':
        console.log(USAGE)
        break
      default:
        console.error(`Unknown command: ${opts.cmd}\n`)
        console.log(USAGE)
        process.exit(1)
    }
  } catch (e) {
    console.error(e.message || e)
    process.exit(1)
  }
}

main()
