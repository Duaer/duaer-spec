#!/usr/bin/env node
/**
 * Sync vendor/github-spec-kit from https://github.com/github/spec-kit
 *
 * Usage:
 *   node scripts/sync-upstream-spec-kit.mjs
 *   node scripts/sync-upstream-spec-kit.mjs --ref v0.0.0
 *   node scripts/sync-upstream-spec-kit.mjs --promote-templates
 *
 * Default ref: origin/main of github/spec-kit (shallow clone).
 * Does not overwrite .specify/templates unless --promote-templates.
 */

import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const VENDOR = join(ROOT, 'vendor', 'github-spec-kit')
const KIT_TEMPLATES = join(ROOT, '.specify', 'templates')
const UPSTREAM = 'https://github.com/github/spec-kit.git'

const args = process.argv.slice(2)
const promote = args.includes('--promote-templates')
const refIdx = args.indexOf('--ref')
const ref = refIdx >= 0 ? args[refIdx + 1] : 'main'

function run(cmd, cwd, opts = {}) {
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd,
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
  })
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim()
    throw new Error(`${cmd.join(' ')} failed (${r.status}): ${err}`)
  }
  return (r.stdout || '').trim()
}

function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'duaer-spec-kit-'))
  console.log(`Cloning ${UPSTREAM} @ ${ref} → ${tmp}`)

  try {
    run(['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse', UPSTREAM, tmp])
    run(['git', 'sparse-checkout', 'init', '--cone'], tmp)
    run(['git', 'sparse-checkout', 'set', 'templates', 'docs'], tmp)
    // Top-level files are outside cone dirs — materialize explicitly.
    run(['git', 'checkout', 'HEAD', '--', 'README.md', 'LICENSE'], tmp)
    if (ref !== 'main') {
      run(['git', 'fetch', '--depth', '1', 'origin', ref], tmp)
      run(['git', 'checkout', 'FETCH_HEAD'], tmp)
      run(['git', 'sparse-checkout', 'set', 'templates', 'docs'], tmp)
      run(['git', 'checkout', 'HEAD', '--', 'README.md', 'LICENSE'], tmp)
    }

    const sha = run(['git', 'rev-parse', 'HEAD'], tmp)
    const short = sha.slice(0, 7)
    const subject = run(['git', 'log', '-1', '--format=%s'], tmp)
    const date = run(['git', 'log', '-1', '--format=%cI'], tmp)

    mkdirSync(VENDOR, { recursive: true })

    for (const name of ['templates', 'docs', 'README.md', 'LICENSE']) {
      const src = join(tmp, name)
      const dest = join(VENDOR, name)
      if (!existsSync(src)) {
        console.warn(`skip missing upstream path: ${name}`)
        continue
      }
      rmSync(dest, { recursive: true, force: true })
      cpSync(src, dest, { recursive: true })
    }

    writeFileSync(join(VENDOR, 'COMMIT.txt'), `${short} ${subject}\n`, 'utf8')
    writeFileSync(
      join(VENDOR, 'SOURCE.txt'),
      [
        `repository: ${UPSTREAM}`,
        `ref: ${ref}`,
        `commit: ${sha}`,
        `date: ${date}`,
        `synced_by: scripts/sync-upstream-spec-kit.mjs`,
        '',
      ].join('\n'),
      'utf8',
    )

    console.log(`vendor/github-spec-kit ← ${short} (${subject})`)

    if (promote) {
      const srcTpl = join(VENDOR, 'templates')
      if (!existsSync(srcTpl)) throw new Error('vendor templates missing after sync')
      mkdirSync(KIT_TEMPLATES, { recursive: true })
      for (const name of [
        'checklist-template.md',
        'constitution-template.md',
        'plan-template.md',
        'spec-template.md',
        'tasks-template.md',
      ]) {
        const from = join(srcTpl, name)
        const to = join(KIT_TEMPLATES, name)
        if (!existsSync(from)) {
          console.warn(`promote skip (missing): ${name}`)
          continue
        }
        cpSync(from, to)
        console.log(`promoted template → .specify/templates/${name}`)
      }
      console.log(
        'Note: Cursor skills under .cursor/skills are not auto-promoted; review vendor/templates/commands and update skills manually.',
      )
    } else {
      console.log('Templates in .specify/ left unchanged. Re-run with --promote-templates after review if desired.')
    }

    // Helpful diff hint
    const diff = spawnSync(
      'diff',
      ['-rq', join(VENDOR, 'templates'), KIT_TEMPLATES],
      { encoding: 'utf8' },
    )
    if (diff.stdout?.trim()) {
      console.log('\nkit templates vs vendor templates:')
      console.log(diff.stdout.trim())
    } else if (diff.status === 0) {
      console.log('\nkit templates match vendor core templates.')
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

try {
  main()
} catch (e) {
  console.error(e.message || e)
  process.exit(1)
}
