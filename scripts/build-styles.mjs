#!/usr/bin/env node
/**
 * Runs `panda codegen`, skipping it when its inputs are unchanged since the last run.
 *
 * `styled-system/` is generated output that only changes when codegen runs, so a stamp file written
 * after each run records a fingerprint of the inputs it was generated from, and codegen is skipped
 * when the current fingerprint matches. This caching is the default because `build:styles` is
 * invoked by `postinstall` and `yarn build`, where the ~17s codegen is wasted when nothing the output
 * depends on changed (the common case after a `yarn install` following a `git pull` that does not
 * touch the Panda config or its version). Pass `--force` to regenerate unconditionally.
 *
 * `panda codegen` derives `styled-system/` from the config alone (the recipes and design tokens it
 * imports), not from the `include` source globs — those drive `panda cssgen`/extraction, not
 * codegen. The inputs are therefore:
 *
 * - The content of the config's module import graph, discovered with esbuild's metafile rather than a
 * hand-maintained whitelist so a newly added (possibly transitive) import cannot silently go
 * untracked.
 * - The root package.json, which carries the Panda version range, the patch resolutions, and the
 * module `type` that decides the generated file extension.
 * - The installed version of the code generator: `@pandacss/dev` and every package the config
 * imports, with their transitive dependencies as they exist in node_modules. Different Panda
 * versions generate different files from the same config (e.g. `index.mjs` versus `index.js`), so
 * switching to a commit with different dependencies must regenerate even when the config is
 * byte-identical.
 *
 * If input discovery fails for any reason, the build runs and no stamp is written — a
 * skipped-when-stale (false negative) is a correctness bug, an unnecessary rebuild is merely slow.
 */
import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import buildFingerprint from './buildFingerprint.mjs'

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

/**
 * Fingerprints the codegen inputs: every module reachable from panda.config.ts (its transitive
 * import graph, per esbuild's metafile), the root package.json, and the installed packages behind
 * `@pandacss/dev` and the config's external imports. Returns null if esbuild cannot resolve the
 * graph, so the caller rebuilds rather than risk skipping when inputs are actually stale.
 */
const fingerprint = async () => {
  try {
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
    const inputs = Object.values(result.metafile.inputs)
    return buildFingerprint({
      files: [
        ...Object.keys(result.metafile.inputs).map(rel => path.resolve(repoDir, rel)),
        path.join(repoDir, 'package.json'),
      ],
      packages: [
        '@pandacss/dev',
        ...inputs.flatMap(input => input.imports.filter(imported => imported.external).map(imported => imported.path)),
      ],
      fromDir: repoDir,
      rootDir: repoDir,
    })
  } catch {
    return null
  }
}

/**
 * The fingerprint is stored in a stamp file inside the outdir (which matches `outdir` in
 * panda.config.ts) so that deleting styled-system also clears the stamp and forces a rebuild; a
 * missing stamp counts as never-built. It is compared by content rather than mtime, because a `git
 * checkout` or `yarn install` gives files new mtimes without changing what codegen would produce,
 * and gives an older commit's files mtimes newer than a stamp written for a different commit.
 */
const outdir = path.join(repoDir, 'styled-system')
const stamp = path.join(outdir, '.build-styles-cache')
const before = await fingerprint()
const lastBuilt = fs.existsSync(stamp) ? fs.readFileSync(stamp, 'utf8') : null

if (force || !before || before !== lastBuilt) {
  console.info('Building styles...')
  // Remove the stamp first so an interrupted codegen leaves none behind and the next run rebuilds.
  fs.rmSync(stamp, { force: true })
  // --clean empties the outdir first, so files a different Panda version generated (e.g. index.js
  // after a switch to a version that generates index.mjs) do not linger beside the new output.
  execSync('panda codegen --clean', { cwd: repoDir, stdio: 'inherit' })
  // `yarn install` can run this script from postinstall while it is still replacing packages in
  // node_modules. If the installed generator changed while codegen ran, the output may come from
  // either version, so no stamp is written and the next run regenerates.
  const after = await fingerprint()
  if (before && after === before) {
    fs.mkdirSync(outdir, { recursive: true })
    fs.writeFileSync(stamp, before)
  }
} else {
  console.info('styled-system is up to date, skipping codegen. Use `yarn build:styles --force` to rebuild.')
}
