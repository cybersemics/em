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

/** The colors spec asserts a WebKit layout bug (#4263) that only a recent WebKit exhibits, so it is the one spec that runs on a newer OS than the rest of the suite. */
const modernWebKitSpec = path.resolve(process.cwd(), 'src/e2e/iOS/__tests__/color.ts')

/** Matches the specs that name an iOS version in their filename, e.g. `doubleTap.ios27.ts`, which runs only on the device with that version instead of the suite's default device. */
const specsForOs = (osVersion: string) => path.resolve(process.cwd(), `src/e2e/iOS/__tests__/**/*.ios${osVersion}.ts`)

/** Builds a BrowserStack device capability, optionally restricting which specs run on it. */
const deviceCapability = ({
  deviceName,
  osVersion,
  specs,
  exclude,
}: {
  /** The BrowserStack device name, e.g. 'iPhone 15 Plus'. */
  deviceName: string
  /** The iOS version to run on the device, e.g. '17'. */
  osVersion: string
  /** Specs to run on this device instead of the suite's. */
  specs?: string[]
  /** Specs to omit from the suite's on this device. */
  exclude?: string[]
}): WebdriverIO.Capabilities => ({
  ...baseConfig.baseCapabilities,
  'appium:deviceName': deviceName,
  'appium:platformVersion': osVersion,
  ...(specs ? { 'wdio:specs': specs } : null),
  ...(exclude ? { 'wdio:exclude': exclude } : null),
  'bstack:options': {
    deviceName,
    osVersion,
    projectName: process.env.BROWSERSTACK_PROJECT_NAME || 'em',
    buildName: process.env.BROWSERSTACK_BUILD_NAME || `Local - ${user} - ${date}`,
    sessionName: `iOS ${osVersion} Safari Tests`,
    // The device reaches the dev server over the public cloudflared HTTPS URL (onPrepare), so
    // BrowserStack Local (`local: true`) is not used on this path. These flags collect diagnostic
    // data on BrowserStack's web dashboard, which we don't need/use.
    debug: false,
    networkLogs: false,
    consoleLogs: 'errors',
    idleTimeout: 60,
  },
})

// Most specs run on iOS 17, which the suite's screen coordinates are calibrated for, and the specs that
// need a newer WebKit run on iOS 26 and 27.
const capabilities = [
  // The suite's default device. Its coordinates are the reason the OS is not simply moved forward:
  // taps and gestures are performed in screen coordinates derived from page coordinates by a fixed
  // Safari chrome offset (toolbarTapOptions), and on iOS 26 four caret tests fail because taps and
  // gestures aimed at the lower half of the page no longer land where that arithmetic says. Moving
  // the whole suite forward means deriving those coordinates from the webview rect first.
  deviceCapability({ deviceName: 'iPhone 15 Plus', osVersion: '17', exclude: [modernWebKitSpec, specsForOs('*')] }),
  // A WebKit recent enough to exhibit the bug the spec assigned here covers. A device suite pinned to
  // an OS that predates the bug under test reports green while users hit it: the Popover margin
  // relayout in #4263 grows the toolbar by 11.6px on iOS 26 and does not reproduce at all on 17, so
  // its regression test passed on the base branch and TDD correctly flagged it as covering nothing.
  deviceCapability({ deviceName: 'iPhone 15 Pro Max', osVersion: '26', specs: [modernWebKitSpec] }),
  // Not a Pro Max, since an iPhone 15 Pro Max on iOS 27 delivered only one touch of doubleTap.ios27.ts's double tap,
  // so it never reproduced the bug (#5660).
  deviceCapability({ deviceName: 'iPhone 15', osVersion: '27', specs: [specsForOs('27')] }),
]

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

  capabilities,

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
