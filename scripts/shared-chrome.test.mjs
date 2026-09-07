/**
 * Integration test for shared-chrome.mjs: launch the real script and assert that the Chrome CDP
 * endpoint it promises actually comes up. Guards against regressions like #4848, where the
 * un-awaited (async since puppeteer 22) `puppeteer.executablePath()` Promise was passed to `spawn`,
 * so Chrome never launched — a failure only observable by actually running the script, which no CI
 * workflow did. Run by .github/workflows/agent-scripts.yml.
 *
 * ```sh
 * node scripts/shared-chrome.test.mjs
 * ```
 *
 * Respects EM_CHROME_PORT like the script itself (CI uses the default :9222, the same port the
 * chrome-devtools MCP and the web executor bridge are configured for). When running locally, note
 * that the script's fixed --user-data-dir means an already-running shared Chrome will prevent this
 * test's instance from launching — stop it first.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const port = process.env.EM_CHROME_PORT || '9222'
const timeoutMs = 60_000
const pollMs = 250

let output = ''
/** Set by the exit handler so the poll loop can fail fast instead of sleeping out the timeout. */
let exited = null

// detached: the script does not forward signals to the Chrome it spawns, so kill the whole process
// group on cleanup rather than orphaning a headless Chrome.
const child = spawn(process.execPath, [fileURLToPath(new URL('shared-chrome.mjs', import.meta.url))], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', data => (output += data))
child.stderr.on('data', data => (output += data))
child.on('exit', (code, signal) => {
  exited = { code, signal }
})

/** Kills the Chrome child process so the test never leaves a browser running. */
const cleanup = () => {
  if (child.pid && !exited) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // process group already gone
    }
  }
}

/** Print the failure and the script's captured output, then exit nonzero. */
const fail = message => {
  console.error(`FAIL: ${message}\n\n--- shared-chrome.mjs output ---\n${output || '(none)'}`)
  cleanup()
  process.exit(1)
}

// Poll the CDP endpoint until it answers, the script dies, or the deadline passes. Each outcome
// fails distinguishably: a crash reports the exit code and log immediately (the #4848 failure
// mode — spawn threw synchronously), a timeout reports the log after 60s.
const deadline = Date.now() + timeoutMs
let version
for (;;) {
  if (exited)
    fail(`script exited (code ${exited.code}, signal ${exited.signal}) before the CDP endpoint answered on :${port}`)
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`)
    if (res.ok) {
      version = await res.json()
      break
    }
  } catch {
    // endpoint not up yet
  }
  if (Date.now() > deadline) fail(`CDP endpoint did not answer on :${port} within ${timeoutMs / 1000}s`)
  await new Promise(resolve => setTimeout(resolve, pollMs))
}

// Assert the responder is really Chrome's CDP handshake — the contract both consumers bootstrap
// from (the chrome-devtools MCP via --browser-url and the web executor bridge via
// puppeteer.connect) — not merely that something answered on the port.
if (!/^(Headless)?Chrome\//.test(version.Browser ?? ''))
  fail(`/json/version Browser is ${JSON.stringify(version.Browser)}, expected (Headless)Chrome/<version>`)
if (!(version.webSocketDebuggerUrl ?? '').startsWith(`ws://127.0.0.1:${port}/`))
  fail(
    `/json/version webSocketDebuggerUrl is ${JSON.stringify(version.webSocketDebuggerUrl)}, expected ws://127.0.0.1:${port}/...`,
  )

console.info(`PASS: shared Chrome (${version.Browser}) answered CDP on :${port}`)
cleanup()
process.exit(0)
