import dotenv from 'dotenv'
import path from 'path'
import browserStackLauncherHooks from './browserStackLauncherHooks'
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

/**
 * WDIO configuration for BrowserStack iOS testing.
 * Uses a pool of named Cloudflare Tunnels (see cloudflareTunnelPool.ts) to expose the local
 * dev server via a public HTTPS URL with a real CA-signed cert, avoiding Safari's self-signed
 * cert restrictions.
 *
 * Prerequisites:
 * 1. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY env vars.
 * 2. Set CLOUDFLARE_TUNNEL_POOL to a JSON array of { name, hostname, token } (provisioned out-of-band — see docs/testing.md).
 * 3. Start the app with `yarn start` (on port 3000, in the default HTTPS mode — the dev pool's
 * ingress connects to https://localhost:3000 with No TLS Verify, so Vite's self-signed cert is
 * accepted). The Vite app-gate token needs no setup: the server generates one and onPrepare
 * discovers it via the gate's /__tunnel-token route (see tunnelTokenGate in vite.config.ts).
 *
 * Run: yarn test:ios:browserstack.
 */
export const config: WebdriverIO.Config = {
  ...baseConfig,
  // onPrepare (dev-server probe, slot wait, tunnel claim, origin check) and onComplete (kill the connector).
  ...browserStackLauncherHooks,

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
}

export default config
