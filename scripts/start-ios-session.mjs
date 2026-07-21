#!/usr/bin/env node
/*
 * Bring up a BrowserStack App Automate iOS session for the agent OUT OF BAND of the wdio MCP.
 *
 * Why this exists: the wdio MCP's `start_session` blocks on BrowserStack provisioning a physical
 * iPhone (~20–40s, variable). In the Copilot cloud agent that straddles the MCP host's fixed,
 * non-configurable request timeout, so the call aborts before the session is ready. Creating the
 * session here — launched detached (setsid + nohup) and polled for via a file — means the agent's
 * Bash call returns immediately, fully immune to that host timeout. The agent can then drive the
 * live session through wdio-MCP via scripts/mcp-session-proxy.mjs, or through the e2e bridge
 * (src/e2e/iOS/attachExistingSession.ts) when it needs the canonical helper suite.
 *
 * What it does:
 *   1. starts a BrowserStack Local tunnel (so the app's baked https://bs-local.com:3000 resolves to
 *      the runner's dev server),
 *   2. creates the App Automate session (caps mirror .github/skills/browser-control-ios/SKILL.md),
 *   3. writes the session id to /tmp/em-bs-session.txt (the shim, bridge, and heartbeat read it)
 *      and a machine-readable status to /tmp/em-ios-bringup.status,
 *   4. stays alive to hold the tunnel open for the whole agent session (the BrowserStack Local
 *      child dies with this process, so it must not exit until the session is done).
 *
 * It never calls deleteSession: the server-side session must outlive this client and is kept warm
 * by the heartbeat (.github/skills/browser-control-ios/heartbeat.sh). On SIGTERM/SIGINT it stops the
 * tunnel cleanly.
 *
 * Env (all optional except creds):
 *   BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY  — required (also read from .env.test.local)
 *   EM_IOS_APP        — BrowserStack app custom_id   (default 'em-server-mode')
 *   EM_IOS_DEVICE     — device name                  (default 'iPhone 15')
 *   EM_IOS_VERSION    — iOS version                  (default '26')
 *   EM_BS_LOCAL_ID    — BrowserStack Local identifier (default 'em-ios-agent')
 *   EM_BRIDGE_SESSION_FILE / EM_IOS_BRINGUP_STATUS   — override the file paths
 */
import { Local } from 'browserstack-local'
import dotenv from 'dotenv'
import { writeFileSync } from 'node:fs'
import https from 'node:https'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

const SESSION_FILE = process.env.EM_BRIDGE_SESSION_FILE ?? '/tmp/em-bs-session.txt'
const STATUS_FILE = process.env.EM_IOS_BRINGUP_STATUS ?? '/tmp/em-ios-bringup.status'
const user = process.env.BROWSERSTACK_USERNAME
const key = process.env.BROWSERSTACK_ACCESS_KEY
const localIdentifier = process.env.EM_BS_LOCAL_ID ?? 'em-ios-agent'
const app = process.env.EM_IOS_APP ?? 'em-server-mode'
const deviceName = process.env.EM_IOS_DEVICE ?? 'iPhone 15'
const osVersion = process.env.EM_IOS_VERSION ?? '26'

/** Write a one-line status the launcher polls (`starting` → `session:<id>` | `error:<msg>`). */
const setStatus = status => {
  try {
    writeFileSync(STATUS_FILE, `${status}\n`)
  } catch {
    /* status file is best-effort diagnostics */
  }
}

/** Log, record the failure for the poller, and exit non-zero. */
const fail = (message, err) => {
  console.error(message, err ?? '')
  setStatus(`error:${message}`)
  process.exit(1)
}

if (!user || !key) {
  fail('missing BrowserStack credentials (BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY)')
}

const bsLocal = new Local()

/** Start the BrowserStack Local tunnel and resolve once it reports connected. */
const startTunnel = () =>
  new Promise((resolve, reject) => {
    // forceLocal is omitted intentionally: it causes nginx to return HTTP 400 on session creation.
    bsLocal.start({ key, localIdentifier }, err => (err ? reject(err) : resolve()))
  })

/** Stop the tunnel (best-effort) and exit. */
const shutdown = () => {
  try {
    bsLocal.stop(() => process.exit(0))
  } catch {
    process.exit(0)
  }
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Caps mirror the wdio MCP `start_session` block in SKILL.md, translated to raw W3C App Automate.
// `local` + `localIdentifier` must match the tunnel above so the device routes localhost through it.
const capabilities = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': deviceName,
  'appium:platformVersion': osVersion,
  'appium:app': app,
  'appium:noReset': true,
  'appium:newCommandTimeout': 900,
  'bstack:options': {
    userName: user,
    accessKey: key,
    realMobile: true,
    appiumVersion: '2.0.0',
    local: true,
    localIdentifier,
    idleTimeout: 900,
    deviceName,
    osVersion,
    projectName: process.env.BROWSERSTACK_PROJECT_NAME ?? 'em',
    buildName: process.env.BROWSERSTACK_BUILD_NAME ?? 'agent-ios',
    sessionName: 'em agent iOS',
  },
}

/**
 * Create the BrowserStack App Automate session via node:https, NOT webdriverio's remote() or
 * fetch. WebdriverIO v9's HTTP layer is undici (as is Node's built-in fetch), and in the Copilot
 * cloud-agent sandbox every undici POST comes back HTTP 400 from the egress MITM proxy
 * (padawan-fw), while identical requests through node:https succeed. The 400 is the sandbox
 * proxy's, not BrowserStack's — outside the sandbox both clients work. Root cause unresolved;
 * node:https sidesteps it.
 */
const createSession = () =>
  new Promise((resolve, reject) => {
    const hub = process.env.BROWSERSTACK_HUB_HOST ?? 'hub-cloud.browserstack.com'
    const body = JSON.stringify({ capabilities: { alwaysMatch: capabilities, firstMatch: [{}] } })
    const auth = Buffer.from(`${user}:${key}`).toString('base64')
    const req = https.request(
      {
        hostname: hub,
        port: 443,
        path: '/wd/hub/session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: `Basic ${auth}`,
        },
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          let json
          try {
            json = JSON.parse(data)
          } catch {
            return reject(new Error(`HTTP ${res.statusCode}: non-JSON response: ${data.slice(0, 200)}`))
          }
          if (res.statusCode !== 200 || json?.value?.error) {
            const msg = json?.value?.message ?? json?.value?.error ?? JSON.stringify(json)
            return reject(new Error(`HTTP ${res.statusCode}: ${msg}`))
          }
          const sessionId = json?.value?.sessionId ?? json?.sessionId
          if (!sessionId) return reject(new Error(`no sessionId in response: ${data.slice(0, 200)}`))
          resolve(sessionId)
        })
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })

const main = async () => {
  setStatus('tunnel-starting')
  try {
    await startTunnel()
  } catch (err) {
    fail(`BrowserStack Local failed to start: ${err?.message ?? err}`, err)
  }

  setStatus('session-creating')
  let sessionId
  try {
    sessionId = await createSession()
  } catch (err) {
    fail(`session create failed: ${err?.message ?? err}`, err)
  }

  writeFileSync(SESSION_FILE, `${sessionId}\n`)
  setStatus(`session:${sessionId}`)
  console.info(`iOS session ready: ${sessionId}`)

  // Hold the process (and thus the tunnel) open. Do NOT deleteSession — the bridge + heartbeat own
  // the live session from here. This resolves only on SIGTERM/SIGINT (shutdown above).
  await new Promise(() => {})
}

main()
