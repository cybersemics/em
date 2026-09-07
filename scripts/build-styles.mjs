#!/usr/bin/env node
/**
 * Runs `panda codegen`, skipping it when its inputs are unchanged since the last run.
 *
 * `styled-system/` is generated output that only changes when codegen runs, so a stamp file written
 * after each run records when codegen last succeeded and the newest input mtime is compared against
 * it. This caching is the default because `build:styles` is invoked by `postinstall` and `yarn
 * build`, where the ~17s codegen is wasted when nothing the config depends on changed (the common
 * case after a `yarn install` following a `git pull` that does not touch the Panda config). Pass
 * `--force` to regenerate unconditionally.
 *
 * `panda codegen` derives `styled-system/` from the config alone (the recipes and design tokens it
 * imports), not from the `include` source globs — those drive `panda cssgen`/extraction, not
 * codegen. The inputs are therefore the config's module import graph, discovered with esbuild's
 * metafile rather than a hand-maintained whitelist so a newly added (possibly transitive) import
 * cannot silently go untracked. The root package.json is included so a Panda version bump declared
 * there also forces regeneration. If input discovery fails for any reason, the build runs — a
 * skipped-when-stale (false negative) is a correctness bug, an unnecessary rebuild is merely slow.
 */
import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

/**
 * Lists the codegen inputs as absolute paths: every module reachable from panda.config.ts (its
 * transitive import graph, per esbuild's metafile) plus the root package.json (which declares the
 * Panda version). Throws if esbuild cannot resolve the graph, so the caller can fall back to
 * rebuilding rather than risk skipping when inputs are actually stale.
 */
const listInputs = async () => {
  const result = await build({
    entryPoints: [path.join(repoDir, 'panda.config.ts')],
    bundle: true,
    packages: 'external',
    metafile: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  })
  return [
    ...Object.keys(result.metafile.inputs).map(rel => path.resolve(repoDir, rel)),
    path.join(repoDir, 'package.json'),
  ]
}

/**
 * Newest modification time across all inputs, or Infinity if discovery fails or an input is missing,
 * so that a discovery error, a deleted import, or a renamed source file all force a rebuild.
 */
const newestInput = await listInputs()
  .then(inputs => Math.max(...inputs.map(file => (fs.existsSync(file) ? fs.statSync(file).mtimeMs : Infinity))))
  .catch(() => Infinity)

/**
 * The newest input is compared against a stamp file that this script writes after each successful
 * codegen, rather than against the generated files' mtimes. `panda codegen` only rewrites files whose
 * content changed, so unchanged outputs keep stale mtimes — making the generated files an unreliable
 * record of when codegen last ran. The stamp lives inside the outdir (which matches `outdir` in
 * panda.config.ts) so that deleting styled-system also clears the stamp and forces a rebuild; a
 * missing stamp counts as never-built. The stamp is written only on success, so an interrupted
 * codegen leaves it stale and the next run rebuilds.
 */
const outdir = path.join(repoDir, 'styled-system')
const stamp = path.join(outdir, '.build-styles-cache')
const lastBuilt = fs.existsSync(stamp) ? fs.statSync(stamp).mtimeMs : 0

if (force || newestInput > lastBuilt) {
  console.info('Building styles...')
  execSync('panda codegen', { cwd: repoDir, stdio: 'inherit' })
  fs.mkdirSync(outdir, { recursive: true })
  fs.writeFileSync(stamp, '')
} else {
  console.info('styled-system is up to date, skipping codegen. Use `yarn build:styles --force` to rebuild.')
}
