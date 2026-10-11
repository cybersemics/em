#!/usr/bin/env node
/**
 * Fails if `packages/ai` resolves a `typescript` that ships no JavaScript compiler API.
 *
 * Vercel builds `packages/ai` as an Express backend (`VERCEL_EXPERIMENTAL_BACKENDS` in
 * [`vercel-preview.yml`](../.github/workflows/vercel-preview.yml)). That build typechecks the
 * service itself: `@vercel/backends` resolves the bare specifier `typescript` from the package
 * directory and calls `ts.sys.readFile`. TypeScript 7 is the native compiler and its package
 * exports only `{ version, versionMajorMinor }`, so `ts.sys` is undefined and the deploy dies with
 * `TypeError: Cannot read properties of undefined (reading 'readFile')` before either preview is
 * published.
 *
 * That is why `packages/ai` aliases `typescript` to `@typescript/typescript6` and keeps the native
 * compiler under `@typescript/native`, whose `tsc` bin is what the package's own `typecheck` script
 * runs. Both names are load-bearing: the package name is what Vercel resolves, the bin is what the
 * repository compiles with. Collapsing them back to a plain `typescript` on 7 reintroduces the
 * failure, which is the shape a major bump arrives in.
 *
 * The check belongs to `yarn lint` because Lint is the one required status check on `main`. No
 * workflow compiles `packages/ai/tsconfig.json` — Puppeteer and BrowserStack filter the package out,
 * Test only transpiles its specs, and `lint:tsc` covers the root program and the iOS tests — so the
 * only other signal is Vercel Preview, which is not required and therefore cannot stop the merge.
 * That is how #5560 landed: it aliased the root manifest and left this one on TypeScript 7,
 * auto-merge merged it twenty seconds after Lint went green with Deploy Preview already red, and
 * `main` went three days without previews.
 */
import { createRequire } from 'node:module'

const aiManifest = new URL('../packages/ai/package.json', import.meta.url)

/**
 * Loads `typescript` as resolved from `packages/ai`, exiting with a diagnostic if it cannot be
 * resolved at all. Resolution starts at the package rather than this script so it walks the same
 * directories Vercel's build does, whether Yarn nested the copy under `packages/ai/node_modules` or
 * hoisted it to the root.
 */
const requireTypeScriptFromAi = () => {
  try {
    return createRequire(aiManifest)('typescript')
  } catch (e) {
    console.error(`packages/ai cannot resolve typescript: ${e.message}`)
    console.error('Run `yarn install` first.')
    process.exit(1)
  }
}

const ts = requireTypeScriptFromAi()

if (typeof ts.sys?.readFile !== 'function') {
  console.error(`packages/ai resolves typescript@${ts.version}, which exposes no JavaScript compiler API.`)
  console.error(
    "Vercel's backend build reads ts.sys.readFile and will fail the em-ai deploy with \"Cannot read properties of undefined (reading 'readFile')\".",
  )
  console.error(
    'Keep "typescript": "npm:@typescript/typescript6@<version>" in packages/ai/package.json, and the native compiler under "@typescript/native".',
  )
  process.exit(1)
}
