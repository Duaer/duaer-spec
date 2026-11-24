// Norm was called duaer-spec until 0.27.11. Imported first by the CLI entry
// points so installs and shells from before the rename keep working.
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// DUAER_* env vars still apply when the NORM_* name is unset.
export function adoptLegacyEnv(env = process.env) {
  for (const key of Object.keys(env)) {
    if (!key.startsWith('DUAER_')) continue
    const next = 'NORM_' + key.slice('DUAER_'.length)
    if (env[next] === undefined) env[next] = env[key]
  }
}

// ~/.duaer (desk workspace, tools, update cache) moves to ~/.norm. Entries
// ~/.norm already has win; ~/.duaer is removed only once it is empty.
export function migrateLegacyHome(home = homedir(), env = process.env) {
  // NODE_TEST_CONTEXT: CLIs spawned by `node --test` must not move the developer's real home.
  if (env.NORM_HOME || env.NODE_TEST_CONTEXT) return
  const from = join(home, '.duaer')
  const to = join(home, '.norm')
  if (!existsSync(from)) return
  if (!existsSync(to)) return renameSync(from, to)
  for (const name of readdirSync(from)) {
    if (!existsSync(join(to, name))) renameSync(join(from, name), join(to, name))
  }
  if (readdirSync(from).length === 0) rmSync(from, { recursive: true })
}

const OLD_ADAPTERS = [
  '.cursor/rules/duaer-spec.mdc',
  '.claude/rules/duaer-spec.md',
  '.windsurf/rules/duaer-spec.md',
  '.devin/rules/duaer-spec.md',
  '.clinerules/duaer-spec.md',
  '.continue/rules/duaer-spec.md',
]
const OLD_SKILL_DIRS = ['.cursor/skills', '.claude/skills', '.agents/skills']
const HOOK_CONFIGS = ['.claude/settings.json', '.cursor/hooks.json', '.codex/hooks.json']

/**
 * Move a product repo installed by duaer-spec onto Norm names:
 * .duaer/ → .norm/, DUADER.md → NORM.md, duaer-init.json → norm-init.json,
 * hook commands → .norm/hooks/…, and drop the old duaer-* adapters that
 * `update` re-installs under norm-* names. Returns what it did.
 */
export function migrateLegacyRepo(target) {
  const done = []
  const mv = (from, to) => {
    if (existsSync(join(target, from)) && !existsSync(join(target, to))) {
      renameSync(join(target, from), join(target, to))
      done.push(`${from} → ${to}`)
    }
  }
  mv('.duaer', '.norm')
  mv('DUADER.md', 'NORM.md')
  mv('.norm/duaer-init.json', '.norm/norm-init.json')

  for (const rel of OLD_ADAPTERS) {
    if (existsSync(join(target, rel))) {
      rmSync(join(target, rel))
      done.push(`removed ${rel}`)
    }
  }
  for (const rel of OLD_SKILL_DIRS) {
    const dir = join(target, rel)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (!name.startsWith('duaer-')) continue
      rmSync(join(dir, name), { recursive: true, force: true })
      done.push(`removed ${rel}/${name}`)
    }
  }
  for (const rel of HOOK_CONFIGS) {
    const file = join(target, rel)
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    const next = text.split('.duaer/hooks/').join('.norm/hooks/')
    if (next !== text) {
      writeFileSync(file, next)
      done.push(`${rel}: hooks → .norm/hooks/`)
    }
  }
  return done
}
