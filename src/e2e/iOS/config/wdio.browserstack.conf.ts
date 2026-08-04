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
      'appium:deviceName': 'iPhone 15 Plus',
      'appium:platformVersion': '17',
      'bstack:options': {
        deviceName: 'iPhone 15 Plus',
        osVersion: '17',
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

      // Append tunnel token to the URL so the Vite token gate allows access
      if (process.env.TUNNEL_TOKEN && process.env.CLOUDFLARED_URL) {
        const sep = process.env.CLOUDFLARED_URL.includes('?') ? '&' : '?'
        process.env.CLOUDFLARED_URL = `${process.env.CLOUDFLARED_URL}${sep}__token=${process.env.TUNNEL_TOKEN}`
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
