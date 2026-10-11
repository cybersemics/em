#!/usr/bin/env node
/**
 * Fails if a Tauri npm package and its Rust crate are on different major.minor releases.
 *
 * `tauri build` refuses to build when they are: it compares `@tauri-apps/api` with the `tauri`
 * crate, and each `@tauri-apps/plugin-<name>` with its `tauri-plugin-<name>` crate, and exits with
 * "Found version mismatched Tauri packages" when the major or minor differs (patch may differ). The
 * npm side is the version Yarn installed, so it is read from `yarn.lock`; the crate side is the one
 * Cargo resolved, so it is read from `desktop/Cargo.lock`. `@tauri-apps/cli` has no crate
 * counterpart in that comparison and is not checked.
 *
 * The check belongs to `yarn lint` because Lint is the one required status check on `main`, and
 * nothing else on a pull request builds the desktop app — `tauri build` runs only in the Tauri
 * Release workflows, on `main`. That is how #5781 landed: Dependabot moved `@tauri-apps/api` to
 * 2.12 while the crate stayed on 2.11, every check on the pull request passed, and every push to
 * `main` after it failed Tauri Release (main).
 */
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** The npm package that pairs with the `tauri` crate. Plugins pair by name instead. */
const API_PACKAGE = '@tauri-apps/api'

/** Matches an official plugin's npm package, capturing the plugin name. */
const PLUGIN_PACKAGE = /^@tauri-apps\/plugin-(.+)$/

/** Every resolved version of each package in a Yarn Berry lockfile, keyed by package name. */
const yarnVersions = yarnLock =>
  yarnLock.split(/\n{2,}/).reduce((versions, block) => {
    const [header] = block.split('\n')
    const version = /^\s+version: "?([^"\s]+)"?$/m.exec(block)?.[1]
    if (!version || !header.endsWith(':')) return versions
    // A header lists every descriptor that resolved to this entry: `"a@npm:^1.0.0, a@npm:^1.2.0":`.
    const names = header
      .slice(0, -1)
      .replace(/"/g, '')
      .split(', ')
      .map(descriptor => /^(@?[^@]+)@/.exec(descriptor)?.[1])
      .filter(Boolean)
    return [...new Set(names)].reduce(
      (acc, name) => ({ ...acc, [name]: [...new Set([...(acc[name] || []), version])] }),
      versions,
    )
  }, {})

/** Every resolved version of each crate in a Cargo lockfile, keyed by crate name. */
const cargoVersions = cargoLock =>
  [...cargoLock.matchAll(/^\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"/gm)].reduce(
    (versions, [, name, version]) => ({ ...versions, [name]: [...(versions[name] || []), version] }),
    {},
  )

/** The `major.minor` of a semver version. */
const majorMinor = version => version.split('.').slice(0, 2).join('.')

/**
 * Lists every Tauri npm package whose installed version differs in major.minor from the crate it
 * pairs with, by the same rule `tauri build` applies. A package or crate with no counterpart on the
 * other side is skipped, as `tauri build` skips it.
 */
const checkTauriVersions = ({ yarnLock, cargoLock }) => {
  const npm = yarnVersions(yarnLock)
  const crates = cargoVersions(cargoLock)
  return Object.keys(npm)
    .map(npmName => ({
      npmName,
      crateName:
        npmName === API_PACKAGE
          ? 'tauri'
          : PLUGIN_PACKAGE.test(npmName)
            ? npmName.replace(PLUGIN_PACKAGE, 'tauri-plugin-$1')
            : null,
    }))
    .filter(({ crateName }) => crateName && crates[crateName])
    .flatMap(({ npmName, crateName }) =>
      npm[npmName].flatMap(npmVersion =>
        crates[crateName]
          .filter(crateVersion => majorMinor(crateVersion) !== majorMinor(npmVersion))
          .map(crateVersion => ({ npmName, npmVersion, crateName, crateVersion })),
      ),
    )
}

export default checkTauriVersions

// run only as a script, not when imported by the test
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mismatches = checkTauriVersions({
    yarnLock: readFileSync(new URL('../yarn.lock', import.meta.url), 'utf8'),
    cargoLock: readFileSync(new URL('../desktop/Cargo.lock', import.meta.url), 'utf8'),
  })
  if (mismatches.length > 0) {
    console.error('Tauri npm packages and Rust crates must be on the same major.minor release, or `tauri build` fails:')
    mismatches.forEach(({ npmName, npmVersion, crateName, crateVersion }) => {
      console.error(`  ${crateName} ${crateVersion} (desktop/Cargo.lock) : ${npmName} ${npmVersion} (yarn.lock)`)
      console.error(
        // numeric, so 2.9 sorts before 2.12
        majorMinor(crateVersion).localeCompare(majorMinor(npmVersion), undefined, { numeric: true }) < 0
          ? `    Move the crate up: cd desktop && cargo update -p ${crateName} --precise <${majorMinor(npmVersion)}.x release>`
          : `    Move the npm package up: yarn up '${npmName}@^${majorMinor(crateVersion)}.0'`,
      )
    })
    process.exit(1)
  }
}
