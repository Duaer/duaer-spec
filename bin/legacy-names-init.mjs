// Side effect only: run before any module reads NORM_* or ~/.norm.
import { adoptLegacyEnv, migrateLegacyHome } from './legacy-names.mjs'

adoptLegacyEnv()
try {
  migrateLegacyHome()
} catch (err) {
  console.error(`warn: could not move ~/.duaer to ~/.norm (${err.message})`)
}
