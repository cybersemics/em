import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { isBuiltin } from 'node:module'
import path from 'node:path'

/** Converts an import specifier such as `@pandacss/dev/presets` to its package name (`@pandacss/dev`). */
const packageName = specifier =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/')

/**
 * Finds the installed directory of a package the way Node resolves it from `fromDir`: the nearest
 * `node_modules/<name>` walking up the directory tree. Reads the directory rather than calling
 * `require.resolve`, because a package's `exports` map can hide its package.json from resolution.
 * Returns null if the package is not installed.
 */
const findPackageDir = (name, fromDir) => {
  const candidate = path.join(fromDir, 'node_modules', name)
  const parent = path.dirname(fromDir)
  return fs.existsSync(path.join(candidate, 'package.json'))
    ? candidate
    : parent === fromDir
      ? null
      : findPackageDir(name, parent)
}

/**
 * Lists every package installed for the given specifiers, transitively through dependencies,
 * optionalDependencies and peerDependencies, as `<path>@<version>` lines (or `<name> missing from
 * <path>` for one that is not installed). Each package is resolved from the directory of the package
 * that depends on it, so a nested copy of a different version is recorded as such.
 */
const installedPackages = (specifiers, { fromDir, rootDir }) => {
  const visited = new Set()
  const lines = []

  /** Records a package and recurses into its dependencies, skipping one already visited. */
  const visit = (name, from) => {
    const dir = findPackageDir(name, from)
    if (!dir) {
      lines.push(`${name} missing from ${path.relative(rootDir, from)}`)
      return
    }
    if (visited.has(dir)) return
    visited.add(dir)
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    lines.push(`${path.relative(rootDir, dir)}@${pkg.version}`)
    Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies }).forEach(dep =>
      visit(dep, dir),
    )
  }

  ;[...new Set(specifiers.filter(specifier => !isBuiltin(specifier)).map(packageName))].forEach(name =>
    visit(name, fromDir),
  )
  return lines.sort()
}

/**
 * Hashes everything that determines a generated output: the content of its source files, and the
 * installed version of every package that generates it (the generator and its transitive
 * dependencies, as they exist in node_modules right now). A build script writes this hash to a stamp
 * after a successful build and skips the next build when the hash still matches.
 *
 * The installed packages are read from node_modules rather than from yarn.lock, because what a
 * build produces depends on the code that actually ran. A build that ran partway through a `yarn
 * install` — while node_modules still held the previous versions — therefore records the previous
 * versions, and the next run after the install finishes sees a different hash and rebuilds. Callers
 * compute the hash both before and after the build and only write the stamp when the two agree, so
 * a build that overlapped with node_modules changing never leaves a stamp behind.
 *
 * A missing source file is hashed as missing rather than throwing, so deleting or renaming a source
 * changes the hash.
 */
const buildFingerprint = ({
  /** Absolute paths of the source files whose content the output is derived from. */
  files,
  /** Import specifiers of the packages that generate the output, e.g. `@pandacss/dev`. */
  packages,
  /** The directory the packages are resolved from, i.e. the package that depends on them. */
  fromDir,
  /** The directory paths are recorded relative to, so the hash is the same in every checkout. */
  rootDir,
}) => {
  const hash = createHash('sha256')
  ;[...new Set(files)].sort().forEach(file => {
    hash.update(`file ${path.relative(rootDir, file)}\0`)
    hash.update(fs.existsSync(file) ? fs.readFileSync(file) : 'missing')
    hash.update('\0')
  })
  installedPackages(packages, { fromDir, rootDir }).forEach(line => hash.update(`package ${line}\0`))
  return hash.digest('hex')
}

export default buildFingerprint
