#!/usr/bin/env node
/**
 * duaer — CLI for the duaer-spec delivery OS (digital employees)
 *
 *   duaer init [dir] [--all|--method|--ops] [--force] [--branch <name>]
 *   duaer check [dir] [--workplace|--delivery|--gate]
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

const USAGE = `duaer — Delivery OS for AI digital employees (duaer-spec ${PKG.version})

Hire agents into a repo, assign Briefs (Specs), accept only when the gate passes.

Usage:
  duaer init [dir] [options]     Hire / onboard into a project
  duaer check [dir] [options]    Workplace + delivery status
  duaer version                  Print version
  duaer help                     Show this help

Init options:
  --all          Full hire: agent ops + method (default)
  --method       Lite: method only (.duaer, skills, DUADER.md, duaer-spec rule)
  --ops          Ops only (AGENTS.md, docs/agent, ops rules)
  --force        Overwrite existing managed files
  --branch <n>   Integration branch for baseline note (default: main)
  --here         Same as dir=.

Check options:
  --workplace    Only verify install files
  --delivery     Only report feature Brief / open tasks / delivery.json
  --gate         Fail unless every feature is accepted (merge gate)
  (default)      Workplace + delivery report; exit 1 on workplace miss
                 or delivery blockers (missing Spec / open tasks / open stamp)

Examples:
  npx duaer-spec init --here
  duaer check .
  duaer check . --gate
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
    gate: false,
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
    else if (a === '--gate') out.gate = true
    else if (a === '--branch') {
      out.branch = rest[++i]
      if (!out.branch) throw new Error('--branch requires a value')
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`)
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

function installMethod(target, opts) {
  console.log('Installing Duaer method…')
  copyPath(join(PKG_ROOT, '.duaer'), join(target, '.duaer'), opts)
  console.log('  .duaer/')

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

Next (digital employee loop):
  1. Orient  — edit .duaer/memory/constitution.md and project-context.md
  2. Workplace — confirm docs/baseline.md (integration branch: ${opts.branch})
  3. Assign  — /duaer-specify  (Brief: what / why / acceptance)
  4. Work    — /duaer-plan → /duaer-tasks → /duaer-implement
  5. Accept  — /duaer-converge  (writes delivery.json; gaps stay open)
  6. Gate    — duaer check . --gate  before merge
  7. Policy  — AGENTS.md wins over DUADER.md when they conflict

No Spec = not assigned. Open tasks or open delivery.json = not accepted.
See DUADER.md and AGENTS.md in the target project.
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
    .map((name) => {
      const dir = join(root, name)
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
        // Brief exists and tasks clear, but never stamped by converge
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
      }

      return {
        name,
        hasSpec,
        tasks,
        stamp,
        verdict,
        blockers,
      }
    })
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

function checkDelivery(target, { gate }) {
  const features = listFeatures(target)
  console.log('\n## Delivery\n')
  if (features.length === 0) {
    console.log('ok   no features under .duaer/specs/ (nothing to accept)')
    return { blocked: 0, unaccepted: 0, features: 0 }
  }

  let blocked = 0
  let unaccepted = 0
  for (const f of features) {
    const taskInfo = f.tasks
      ? `tasks open=${f.tasks.open} done=${f.tasks.done}`
      : 'no tasks.md'
    const line = `${f.verdict.padEnd(10)} ${f.name}  spec=${f.hasSpec ? 'yes' : 'NO'}  stamp=${f.stamp}  ${taskInfo}`
    console.log(line)
    if (f.blockers.length) {
      for (const b of f.blockers) console.log(`           · ${b}`)
    }
    if (f.verdict === 'blocked') blocked++
    if (f.verdict === 'unaccepted') unaccepted++
  }

  if (gate) {
    console.log('\nGate mode: every feature must be accepted.')
  }
  return { blocked, unaccepted, features: features.length }
}

function cmdCheck(opts) {
  const target = resolve(opts.dir)
  // Default: workplace + delivery. --gate alone is delivery-only (merge gate).
  const runWorkplace = opts.workplace || (!opts.delivery && !opts.gate)
  const runDelivery = opts.delivery || opts.gate || !opts.workplace

  console.log(`Checking ${target}${opts.gate ? ' (gate)' : ''}\n`)

  let workplaceMissing = 0
  if (runWorkplace) {
    workplaceMissing = checkWorkplace(target)
  }

  let delivery = { blocked: 0, unaccepted: 0, features: 0 }
  if (runDelivery) {
    delivery = checkDelivery(target, { gate: opts.gate })
  }

  let fail = false
  if (workplaceMissing) {
    console.log(`\n${workplaceMissing} workplace file(s) missing — run: duaer init ${opts.dir} --all`)
    fail = true
  }

  if (runDelivery) {
    if (delivery.blocked) {
      console.log(`\n${delivery.blocked} feature(s) blocked — close open tasks / fix Spec / re-run converge`)
      fail = true
    }
    if (opts.gate && delivery.unaccepted) {
      console.log(
        `\n${delivery.unaccepted} feature(s) not accepted — run /duaer-converge until delivery.json status=accepted`,
      )
      fail = true
    } else if (!opts.gate && delivery.unaccepted) {
      console.log(
        `\n${delivery.unaccepted} feature(s) not yet accepted (warning). Use --gate to fail the merge check.`,
      )
    }
  }

  if (!fail) {
    if (opts.gate) {
      console.log('\nGate passed — deliverable.')
    } else if (runWorkplace && !workplaceMissing) {
      console.log('\nWorkplace ready. Use --gate before merge when features exist.')
    } else {
      console.log('\nDelivery report done.')
    }
  } else {
    process.exitCode = 1
  }
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
