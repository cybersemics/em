/**
 * Integration test for the web executor bridge (src/e2e/puppeteer/attachExistingBrowserInstance.ts):
 * launch the real shared Chrome (scripts/shared-chrome.mjs) on the bridge's default :9222, then
 * attach through the real module and assert it binds the live tab. Together with
 * shared-chrome.test.mjs this covers both halves of the "one browser, two ways in" contract
 * (docs/agents/environment.md), and it shares shared-chrome's regression vector: a puppeteer API
 * change arriving with a version bump (#4848). Run by .github/workflows/agent-scripts.yml.
 *
 * ```sh
 * npx tsx scripts/bridge-attach.test.ts
 * ```
 *
 * `npx tsx` is deliberately the runner: it is exactly how the browser-control-chrome skill has
 * agents invoke the bridge, so this test breaks when that documented flow breaks. As with
 * shared-chrome.test.mjs, an already-running shared Chrome (fixed --user-data-dir) must be stopped
 * before running locally.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const port = '9222'
const timeoutMs = 60_000
const pollMs = 250

/** Runs the bridge attach test: launch the shared Chrome, attach through the real module, and assert it binds the live tab. */
const main = async () => {
  let output = ''
  /** Set by the exit handler so the poll loop can fail fast instead of sleeping out the timeout. */
  let exited: { code: number | null; signal: string | null } | null = null

  // detached: the script does not forward signals to the Chrome it spawns, so kill the whole
  // process group on cleanup rather than orphaning a headless Chrome.
  const child = spawn(process.execPath, [fileURLToPath(new URL('shared-chrome.mjs', import.meta.url))], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout!.on('data', data => (output += data))
  child.stderr!.on('data', data => (output += data))
  child.on('exit', (code, signal) => {
    exited = { code, signal }
  })

  /** Kills the shared Chrome child process and clears the timers, so the test never leaves a browser running. */
  const cleanup = () => {
    if (child.pid && !exited) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        // process group already gone
      }
    }
  }

  /** Print the failure and the shared Chrome's captured output, then exit nonzero. */
  const fail = (message: string): never => {
    console.error(`FAIL: ${message}\n\n--- shared-chrome.mjs output ---\n${output || '(none)'}`)
    cleanup()
    process.exit(1)
  }

  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (exited)
      fail(`shared-chrome exited (code ${exited.code}, signal ${exited.signal}) before the CDP endpoint answered`)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) break
    } catch {
      // endpoint not up yet
    }
    if (Date.now() > deadline) fail(`CDP endpoint did not answer on :${port} within ${timeoutMs / 1000}s`)
    await new Promise(resolve => setTimeout(resolve, pollMs))
  }

  // Open a second tab at a URL we control (the fresh Chrome's initial tab is chrome://new-tab-page/),
  // so the bridge must actually select the matching tab among several — its real job of finding the
  // em tab. PUT /json/new is Chrome's own CDP HTTP endpoint, so the arrange needs no puppeteer.
  const newTab = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  if (!newTab.ok) fail(`could not open a tab via /json/new: HTTP ${newTab.status}`)

  // Match the controlled tab through the documented seam. The env var must be set before the module
  // loads (URL_MATCH is read at import time), hence the dynamic import.
  process.env.EM_BRIDGE_URL_MATCH = 'about:blank'
  const { default: attachExistingBrowserInstance } = await import('../src/e2e/puppeteer/attachExistingBrowserInstance')
  const { browser, page } = await attachExistingBrowserInstance()

  if (page.url() !== 'about:blank') fail(`bridge bound a page at ${JSON.stringify(page.url())}, expected about:blank`)

  // The module's whole purpose is publishing the tab for the e2e helpers — assert the live binding.
  const session = await import('../src/e2e/puppeteer/session')
  if (session.page !== page) fail('setPage did not publish the attached page to src/e2e/puppeteer/session')

  // Prove the handle is usable, not just found: a CDP round-trip through the bound page.
  const sum = await page.evaluate(() => 1 + 2)
  if (sum !== 3) fail(`page.evaluate round-trip returned ${JSON.stringify(sum)}, expected 3`)

  // Disconnect, never close() — in production the chrome-devtools MCP shares this Chrome.
  await browser.disconnect()

  console.info(`PASS: bridge attached to the shared Chrome on :${port} and bound the live tab`)
  cleanup()
  process.exit(0)
}

main()
