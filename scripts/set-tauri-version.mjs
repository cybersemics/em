/**
 * Writes an MSI-compatible version into desktop/tauri.conf.json, derived from the
 * package.json version by subtracting an offset from the major number.
 *
 * Why this exists: em's version major (e.g. 351) has grown far beyond the limits of
 * the Windows Installer (MSI) version format, which caps both the major and minor
 * fields at 255 (only the build/patch field goes up to 65535). WiX therefore rejects
 * em's version with `app version major number cannot be greater than 255`, so the
 * desktop version cannot simply track package.json.
 *
 * The offset maps em's climbing major into MSI's valid 1–255 range while preserving
 * uniqueness and monotonic ordering (e.g. 351.0.0 -> 1.0.0, 351.0.1 -> 1.0.1,
 * 352.0.0 -> 2.0.0). This holds until em's major reaches OFFSET + 255; past that the
 * offset must be bumped. The script fails loudly at that boundary so we get a clear
 * signal instead of a cryptic WiX error.
 *
 * Run before `tauri build` (see the tauri-release workflows). CI checkouts are
 * ephemeral, so the mutated tauri.conf.json is never committed and package.json
 * remains the single source of truth.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Amount subtracted from em's major to land inside MSI's 1–255 major range.
const OFFSET = 350

// MSI version field limits (major.minor.build).
const MAX_MAJOR = 255
const MAX_MINOR = 255
const MAX_BUILD = 65535

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = resolve(rootDir, 'package.json')
const tauriConfigPath = resolve(rootDir, 'desktop', 'tauri.conf.json')

const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
if (!match) {
  throw new Error(`Expected a numeric major.minor.patch version in package.json, got "${version}".`)
}

const [, majorStr, minorStr, patchStr] = match
const major = Number(majorStr) - OFFSET
const minor = Number(minorStr)
const patch = Number(patchStr)

if (major < 1) {
  throw new Error(
    `em major ${majorStr} is at or below the offset ${OFFSET}; the resulting MSI major ${major} is invalid (must be >= 1).`,
  )
}
if (major > MAX_MAJOR) {
  throw new Error(
    `em major ${majorStr} exceeds OFFSET + ${MAX_MAJOR} (${OFFSET + MAX_MAJOR}); increase OFFSET in scripts/set-tauri-version.mjs.`,
  )
}
if (minor > MAX_MINOR) {
  throw new Error(`Minor version ${minor} exceeds the MSI limit of ${MAX_MINOR}.`)
}
if (patch > MAX_BUILD) {
  throw new Error(`Patch version ${patch} exceeds the MSI build limit of ${MAX_BUILD}.`)
}

const desktopVersion = `${major}.${minor}.${patch}`

const config = readFileSync(tauriConfigPath, 'utf8')
const updated = config.replace(/("version":\s*)"[^"]*"/, `$1"${desktopVersion}"`)

if (updated === config) {
  throw new Error('Could not find a "version" field to replace in desktop/tauri.conf.json.')
}

writeFileSync(tauriConfigPath, updated)

console.info(`Set Tauri desktop version to ${desktopVersion} (from em ${version}).`)
