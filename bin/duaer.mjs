#!/usr/bin/env node
/**
 * duaer — CLI for the duaer-spec methodology
 *
 *   duaer init [dir] [--all|--method|--ops] [--force] [--branch <name>]
 *   duaer check [dir]
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

const USAGE = `duaer — Duaer methodology installer (duaer-spec ${PKG.version})

Usage:
  duaer init [dir] [options]   Install Duaer into a project
  duaer check [dir]            Verify install shape
  duaer version                Print version
  duaer help                   Show this help

Init options:
  --all          Agent ops + method (default)
  --method       Method only (.duaer, skills, DUADER.md, duaer-spec rule)
  --ops          Agent ops only (AGENTS.md, docs/agent, ops rules)
  --force        Overwrite existing managed files
  --branch <n>   Integration branch for baseline note (default: main)
  --here         Same as dir=.

Examples:
  npx github:fujiezee/duaer-spec duaer init --here
  node bin/duaer.mjs init ../my-app --all
  duaer check .
`

function parseArgs(argv) {
  const args = argv.slice(2)
  const out = {
    cmd: args[0] || 'help',
    dir: '.',
    mode: 'all',
    force: false,
    branch: 'main',
  }
  const rest = args.slice(1)
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    if (a === '--all') out.mode = 'all'
    else if (a === '--method') out.mode = 'method'
    else if (a === '--ops') out.mode = 'ops'
    else if (a === '--force') out.force = true
    else if (a === '--here') out.dir = '.'
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
      // merge: copy children carefully
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
Done.

Next:
  1. Edit .duaer/memory/constitution.md and project-context.md for this product
  2. Confirm docs/baseline.md (integration branch: ${opts.branch})
  3. In Cursor, use /duaer-specify → /duaer-plan → /duaer-tasks → /duaer-implement → /duaer-converge
  4. Agent ops: AGENTS.md wins over DUADER.md when they conflict

See DUADER.md and AGENTS.md in the target project.
`)
}

function cmdCheck(dir) {
  const target = resolve(dir)
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
  console.log(`Checking ${target}\n`)
  for (const [rel, kind] of checks) {
    const ok = existsSync(join(target, rel))
    console.log(`${ok ? 'ok ' : 'MISS'}  [${kind}] ${rel}`)
    if (!ok) missing++
  }
  if (missing) {
    console.log(`\n${missing} missing — run: duaer init ${dir} --all`)
    process.exitCode = 1
  } else {
    console.log('\nInstall looks complete.')
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
        cmdCheck(opts.dir)
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
