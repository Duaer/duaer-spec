#!/usr/bin/env node
/**
 * duaer — CLI for the duaer-spec delivery OS (digital employees)
 *
 *   duaer init [dir] [--all|--method|--ops] [--force] [--branch <name>]
 *   duaer check [dir] [--workplace|--delivery|--job|--all-jobs|--strict]
 *   duaer job [dir]
 *   duaer policy [dir] [off|coach|strict]
 *   duaer version
 *   duaer help
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
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const PKG = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'))

const POLICY_MODES = new Set(['off', 'coach', 'strict'])

const USAGE = `duaer — Delivery OS for AI digital employees (duaer-spec ${PKG.version})

Job-level handoff (not a repo merge lock). Default policy: coach.

Usage:
  duaer init [dir] [options]              Hire / onboard into a project
  duaer check [dir] [options]             Workplace + active-job handoff
  duaer job [dir]                         Show the active job status
  duaer policy [dir] [off|coach|strict]   Show or set handoff policy
  duaer version                           Print version
  duaer help                              Show this help

Init options:
  --all          Full hire: agent ops + method (default)
  --method       Lite: method only
  --ops          Ops only
  --force        Overwrite existing managed files
  --branch <n>   Integration branch for baseline note (default: main)
  --here         Same as dir=.

Check options:
  --workplace    Only verify install files
  --delivery     Alias for active-job handoff report
  --job          Active job only (default for delivery)
  --all-jobs     Report every feature under .duaer/specs/
  --strict       Exit 1 if active job is not accepted (optional)
  --gate         Deprecated alias for --strict (job handoff, not CI)

Policy modes (stored in .duaer/delivery-policy.json):
  off     Record only; never fail handoff
  coach   Default — guide / warn; do not claim "done" until accepted
  strict  Agents must not report delivery complete until accepted;
          duaer check exits 1 on unfinished active job

Examples:
  npx duaer-spec init --here
  duaer job .
  duaer policy . coach
  duaer check .
  duaer check . --strict
`

function parseArgs(argv) {
  const args = argv.slice(2)
  const out = {
    cmd: args[0] || 'help',
    dir: '.',
    mode: 'all',
    force: false,
    branch: 'main',
    workplace: false,
    delivery: false,
    job: false,
    allJobs: false,
    strict: false,
    policyMode: null,
  }
  const rest = args.slice(1)
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--all') out.mode = 'all'
    else if (a === '--method') out.mode = 'method'
    else if (a === '--ops') out.mode = 'ops'
    else if (a === '--force') out.force = true
    else if (a === '--here') out.dir = '.'
    else if (a === '--workplace') out.workplace = true
    else if (a === '--delivery') out.delivery = true
    else if (a === '--job') out.job = true
    else if (a === '--all-jobs') out.allJobs = true
    else if (a === '--strict' || a === '--gate') out.strict = true
    else if (a === '--branch') {
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

function installMethod(target, opts) {
  console.log('Installing Duaer method…')
  copyPath(join(PKG_ROOT, '.duaer'), join(target, '.duaer'), opts)
  console.log('  .duaer/')
  writeDefaultPolicy(target, opts)

  ensureDir(join(target, '.cursor', 'skills'))
  const skillsRoot = join(PKG_ROOT, '.cursor', 'skills')
  for (const name of readdirSync(skillsRoot)) {
    if (!name.startsWith('duaer-')) continue
    copyPath(join(skillsRoot, name), join(target, '.cursor', 'skills', name), opts)
  }
  console.log('  .cursor/skills/duaer-*')

  ensureDir(join(target, '.cursor', 'rules'))
  copyPath(
    join(PKG_ROOT, '.cursor', 'rules', 'duaer-spec.mdc'),
    join(target, '.cursor', 'rules', 'duaer-spec.mdc'),
    opts,
  )
  console.log('  .cursor/rules/duaer-spec.mdc')

  copyPath(join(PKG_ROOT, 'DUADER.md'), join(target, 'DUADER.md'), opts)
  console.log('  DUADER.md')
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

  ensureDir(join(target, 'docs', 'agent'))
  for (const name of ['workflow.md', 'change-checklist.md', 'e2e-test-plan.md', 'README.md']) {
    copyPath(
      join(PKG_ROOT, 'docs', 'agent', name),
      join(target, 'docs', 'agent', name),
      opts,
    )
  }
  console.log('  docs/agent/')

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
  if (opts.mode === 'all' || opts.mode === 'method') {
    writeInitMarker(target, opts)
  }

  console.log(`
Hired.

Next (digital employee loop — job handoff, not a repo lock):
  1. Orient  — edit .duaer/memory/constitution.md and project-context.md
  2. Policy  — duaer policy .   (default coach; optional: off | strict)
  3. Assign  — /duaer-specify   (sets active job + Brief)
  4. Work    — /duaer-plan → /duaer-tasks → /duaer-implement
  5. Accept  — /duaer-converge  (stamps delivery.json)
  6. Job     — duaer job .      (see if this job can be reported done)
  7. Ops     — AGENTS.md wins over DUADER.md when they conflict

No Spec = not assigned. Unaccepted active job = do not claim "done".
Git merge is not blocked by default.
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
    ['DUADER.md', 'method'],
    ['.cursor/rules/duaer-spec.mdc', 'method'],
    ['.cursor/skills/duaer-specify/SKILL.md', 'method'],
    ['AGENTS.md', 'ops'],
    ['.cursor/rules/agents-workflow.mdc', 'ops'],
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

  console.log(`Active job @ ${target}`)
  console.log(`policy: ${policy.mode}\n`)
  if (!active) {
    console.log('No active job. Assign with /duaer-specify (writes .duaer/active-job.json).')
    return
  }
  printFeature(active)
  if (active.verdict === 'accepted') {
    console.log('\nHandoff script: "✅ Job accepted — Brief satisfied per converge; ready for your review."')
  } else {
    console.log('\nHandoff script: "This job is not accepted yet — Spec/tasks/converge still open."')
    if (policy.mode !== 'off') {
      console.log('Do not claim delivery complete until duaer job shows accepted.')
    }
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
      case 'check':
        cmdCheck(opts)
        break
      case 'job':
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
