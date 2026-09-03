#!/usr/bin/env node
/**
 * Builds the package, skipping the build when its sources are unchanged since the last build.
 *
 * `dist/` is generated output that only changes when this build runs, so comparing the newest input
 * mtime against the build outputs (read from rollup.config.mjs) is sufficient to detect staleness.
 * This caching is the default because `build` is invoked transitively by `postinstall` and
 * `yarn build`, where the ~70s build is wasted when nothing under packages/webview changed (the
 * common case after a `yarn install` following a `git pull` that does not touch this package). Pass
 * `--force` to rebuild unconditionally.
 *
 * The inputs are every non-gitignored file in the package, as reported by git. Using git as the
 * source of truth means generated output (dist/, node_modules) is excluded for free and any future
 * source or config file is tracked automatically, so a new build input cannot silently go unnoticed.
 */
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

/** Recursively collects every file path under a directory (fallback when git is unavailable). */
const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })

/**
 * Lists the package's source inputs as absolute paths: every non-gitignored file (tracked plus
 * untracked-but-not-ignored). Falls back to walking src and the build configs if git is unavailable,
 * e.g. when building from an extracted tarball rather than a checkout.
 */
const listInputs = () => {
  try {
    return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: packageDir,
    })
      .toString()
      .split('\0')
      .filter(Boolean)
      .map(rel => path.join(packageDir, rel))
  } catch {
    return [
      ...walk(path.join(packageDir, 'src')),
      path.join(packageDir, 'tsconfig.json'),
      path.join(packageDir, 'rollup.config.mjs'),
      path.join(packageDir, 'package.json'),
    ]
  }
}

/**
 * Newest modification time across all inputs. A missing input (e.g. a tracked file deleted from the
 * working tree) counts as infinitely new so that removing or renaming a source file forces a rebuild.
 */
const newestInput = Math.max(
  ...listInputs().map(file => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : Infinity)),
)

/**
 * The build outputs to compare against, read from rollup.config.mjs rather than hardcoded so the
 * check stays correct if the output files change. Comparing against the oldest output (and treating
 * a missing output as never-built) means an incomplete build — e.g. one interrupted after writing
 * some outputs but not others — is also detected as stale.
 */
const rollupConfig = (await import(pathToFileURL(path.join(packageDir, 'rollup.config.mjs')))).default
const outputs = [rollupConfig.output].flat().map(output => path.resolve(packageDir, output.file))
const oldestOutput = Math.min(
  ...outputs.map(file => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0)),
)

if (force || newestInput > oldestOutput) {
  execSync('yarn clean && yarn docgen && tsc && rollup -c rollup.config.mjs', {
    cwd: packageDir,
    stdio: 'inherit',
  })
} else {
  console.info('webview-background is up to date, skipping build. Use `yarn build --force` to rebuild.')
}
