import { type ChildProcess } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'
import { findFirstAvailableTunnel, parseTunnelPool } from './cloudflareTunnelPool'
import baseConfig from './wdio.base.conf.js'

// Load .env.test.local before checking env vars since this file is imported
// at module load time, before vitest's automatic env loading kicks in
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

// Validate environment variables
if (!process.env.BROWSERSTACK_USERNAME) {
  throw new Error('process.env.BROWSERSTACK_USERNAME not defined')
}
if (!process.env.BROWSERSTACK_ACCESS_KEY) {
  throw new Error('process.env.BROWSERSTACK_ACCESS_KEY not defined')
}

const user = process.env.BROWSERSTACK_USERNAME
const date = new Date().toISOString().slice(0, 10)

// Pinned so CI is reproducible. Override to reproduce a bug reported on another device or iOS version —
// WebKit's text interaction has changed across major versions, so the OS is sometimes the variable under test
// (see docs/cursor-and-caret.md). Same names the agent bring-up script uses (scripts/start-ios-session.mjs).
const deviceName = process.env.EM_IOS_DEVICE ?? 'iPhone 15 Plus'
const osVersion = process.env.EM_IOS_VERSION ?? '17'

// The trackpad spec drives the virtual keyboard's caret scrub, which only drags the caret out of its editing
// host on Safari 26. On the pinned OS the caret clamps to the thought, so the test would pass without
// exercising the behaviour it exists to protect. Run it on a current iOS, and only it.
const TRACKPAD_SPEC = path.resolve(process.cwd(), 'src/e2e/iOS/__tests__/trackpad.ts')
const trackpadDeviceName = process.env.EM_IOS_TRACKPAD_DEVICE ?? 'iPhone 15 Pro Max'
const trackpadOsVersion = process.env.EM_IOS_TRACKPAD_VERSION ?? '26'

let tunnelProcess: ChildProcess | null = null

/**
 * WDIO configuration for BrowserStack iOS testing.
 * Uses a pool of named Cloudflare Tunnels (see cloudflareTunnelPool.ts) to expose the local
 * HTTPS dev server via a public URL with a real CA-signed cert, avoiding Safari's self-signed
 * cert restrictions.
 *
 * Prerequisites:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY env vars.
 * 2. Set CLOUDFLARE_TUNNEL_POOL to a JSON array of { name, hostname, token } (provisioned out-of-band — see docs/testing.md).
 * 3. Set TUNNEL_TOKEN to a per-run secret (the Vite app-gate token — see vite.config.ts).
 * 4. Start the app: yarn start (on port 3000).
 *
 * Run: yarn test:ios:browserstack.
 * Target another device: EM_IOS_DEVICE='iPhone 15 Pro Max' EM_IOS_VERSION=26 yarn test:ios:browserstack.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,

  // BrowserStack Configuration
  user,
  key: process.env.BROWSERSTACK_ACCESS_KEY,

  // Capabilities
  capabilities: [
    {
      ...baseConfig.baseCapabilities,
      'appium:deviceName': deviceName,
      'appium:platformVersion': osVersion,
      'wdio:exclude': [TRACKPAD_SPEC],
      'bstack:options': {
        deviceName,
        osVersion,
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'iOS Safari Tests',
        // The device reaches the dev server over the public cloudflared HTTPS URL (onPrepare), so
        // BrowserStack Local (`local: true`) is not used on this path. These flags collect diagnostic
        // data on BrowserStack's web dashboard, which we don't need/use.
        debug: false,
        networkLogs: false,
        consoleLogs: 'errors',
        idleTimeout: 60,
      },
    },
    {
      ...baseConfig.baseCapabilities,
      'appium:deviceName': trackpadDeviceName,
      'appium:platformVersion': trackpadOsVersion,
      'wdio:specs': [TRACKPAD_SPEC],
      'bstack:options': {
        deviceName: trackpadDeviceName,
        osVersion: trackpadOsVersion,
        projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
        buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
        sessionName: 'iOS Safari Trackpad Tests',
        debug: false,
        networkLogs: false,
        consoleLogs: 'errors',
        idleTimeout: 60,
      },
    },
  ],

  // Services
  services: [
    [
      'browserstack',
      {
        testObservability: true,
      },
    ],
  ],

  onPrepare: async function () {
    try {
      // Claim a tunnel from the pool if not already set (e.g. by a CI workflow step)
      if (!process.env.CLOUDFLARED_URL) {
        if (!process.env.CLOUDFLARE_TUNNEL_POOL) {
          throw new Error(
            'CLOUDFLARE_TUNNEL_POOL is not set. The pool is provisioned out-of-band by whoever administers ' +
              'it; set CLOUDFLARE_TUNNEL_POOL to that JSON output (see docs/testing.md).',
          )
        }
        if (!process.env.TUNNEL_TOKEN) {
          throw new Error('TUNNEL_TOKEN (the per-run Vite app-gate token) must be set to claim a tunnel from the pool.')
        }

        const pool = parseTunnelPool(process.env.CLOUDFLARE_TUNNEL_POOL)
        const claimed = await findFirstAvailableTunnel(pool, process.env.TUNNEL_TOKEN)
        tunnelProcess = claimed.process
        process.env.CLOUDFLARED_URL = claimed.url
        console.info(`cloudflared tunnel: ${claimed.name} (${claimed.url})`)
      }

      // Append the app-gate token via the URL API so the href always includes `/` before `?`.
      // String concat on `https://host` produces `https://host?__token=`, which iOS Safari does
      // not load as `/` — the first WDIO session then fails `before` while later retries pass.
      if (process.env.TUNNEL_TOKEN && process.env.CLOUDFLARED_URL) {
        const origin = new URL(process.env.CLOUDFLARED_URL)
        origin.searchParams.set('__token', process.env.TUNNEL_TOKEN)
        process.env.CLOUDFLARED_URL = origin.href
      }

      await baseConfig.onPrepare()
    } catch (err) {
      // Exit rather than rethrow. WebdriverIO logs a failed launcher hook and then starts the
      // workers regardless, so a misconfigured run proceeds to open a device against a URL that
      // was never set — every spec then fails on an opaque origin ("The operation is insecure",
      // "em.testHelpers is undefined", editable timeouts), each retried, burning a full ~20 min
      // BrowserStack build. All of it traces back to here, but the real cause ends up buried at
      // the top of a thousand lines of consequences. Exiting makes it the last thing printed.
      if (tunnelProcess) tunnelProcess.kill()
      console.error(`\niOS test setup failed: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exit(1)
    }
  },

  onComplete: function () {
    if (tunnelProcess) {
      tunnelProcess.kill()
      tunnelProcess = null
    }
  },
}

export default config
