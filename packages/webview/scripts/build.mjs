#!/usr/bin/env node
/**
 * Builds the package, skipping the build when its inputs are unchanged since the last build.
 *
 * `dist/` is generated output that only changes when this build runs, so a stamp file written after
 * each build records a fingerprint of the inputs it was built from, and the build is skipped when the
 * current fingerprint matches and every output exists. This caching is the default because `build`
 * is invoked transitively by `postinstall` and `yarn build`, where the ~70s build is wasted when
 * nothing it depends on changed (the common case after a `yarn install` following a `git pull` that
 * does not touch this package). Pass `--force` to rebuild unconditionally.
 *
 * The inputs are:
 *
 * - The content of every non-gitignored file in the package, as reported by git. Using git as the
 * source of truth means generated output (dist/, node_modules) is excluded for free and any future
 * source or config file is tracked automatically, so a new build input cannot silently go unnoticed.
 * README.md is excluded because docgen rewrites it during the build.
 * - The installed version of every build tool the package declares (typescript, rollup, docgen, the
 * Capacitor packages it compiles against) with their transitive dependencies as they exist in
 * node_modules, so switching to a commit with different dependencies rebuilds even when the sources
 * are byte-identical.
 */
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import buildFingerprint from '../../../scripts/buildFingerprint.mjs'

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
 * untracked-but-not-ignored) except the README that docgen generates. Falls back to walking src and
 * the build configs if git is unavailable, e.g. when building from an extracted tarball rather than a
 * checkout.
 */
const listInputs = () => {
  try {
    return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: packageDir,
    })
      .toString()
      .split('\0')
      .filter(rel => rel && rel !== 'README.md')
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

/** Fingerprints the package's sources and the installed versions of everything it declares. */
const fingerprint = () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
  return buildFingerprint({
    files: listInputs(),
    packages: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }),
    fromDir: packageDir,
    rootDir: packageDir,
  })
}

/**
 * The build outputs, read from rollup.config.mjs rather than hardcoded so the check stays correct if
 * the output files change. A missing output counts as never-built, so a dist/ that was partly
 * deleted is rebuilt even when the stamp matches.
 */
const rollupConfig = (await import(pathToFileURL(path.join(packageDir, 'rollup.config.mjs')))).default
const outputs = [rollupConfig.output].flat().map(output => path.resolve(packageDir, output.file))

/**
 * The fingerprint is stored in a stamp inside dist/, which `yarn clean` removes at the start of every
 * build, so an interrupted build leaves no stamp and the next run rebuilds. It is compared by content
 * rather than mtime, because a `git checkout` or `yarn install` gives files new mtimes without
 * changing what the build would produce.
 */
const stamp = path.join(packageDir, 'dist', '.build-cache')
const before = fingerprint()
const lastBuilt = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : null

if (force || before !== lastBuilt || !outputs.every(file => fs.existsSync(file))) {
  execSync('yarn clean && yarn docgen && tsc && rollup -c rollup.config.mjs', {
    cwd: packageDir,
    stdio: 'inherit',
  })
  // `yarn install` can run this script from postinstall while it is still replacing packages in
  // node_modules. If a build tool changed while the build ran, the output may come from either
  // version, so no stamp is written and the next run rebuilds.
  if (fingerprint() === before) {
    fs.writeFileSync(stamp, before)
  }
} else {
  console.info('webview-background is up to date, skipping build. Use `yarn build --force` to rebuild.')
}
