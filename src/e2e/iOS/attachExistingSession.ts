import { readFileSync } from 'node:fs'
import { attach } from 'webdriverio'

/**
 * Session id is written here by whoever created the session: the `browser-control-ios` skill on
 * BrowserStack, or the local-session bring-up step. Override with `EM_BRIDGE_SESSION_FILE`.
 */
const SESSION_FILE = process.env.EM_BRIDGE_SESSION_FILE ?? '/tmp/em-bs-session.txt'

/** WebDriver endpoint for the live session. */
interface Endpoint {
  hostname: string
  port: number
  protocol: 'http' | 'https'
  path: string
  user?: string
  key?: string
}

/**
 * Resolve the WebDriver endpoint for the live session. Defaults to the local shim on
 * `127.0.0.1:4723/wd/hub` (started by bringup.sh), which owns the BrowserStack transport. Goes
 * straight to BrowserStack only when `EM_BRIDGE_TARGET=browserstack` is set explicitly — CI / local
 * dev, where there is no sandbox egress firewall; the host defaults to `hub-cloud.browserstack.com`
 * (override with `BROWSERSTACK_HUB_HOST`). Point at a real local Appium with `APPIUM_HOST/PORT/PATH`.
 */
export const resolveEndpoint = (): Endpoint => {
  // Direct to BrowserStack ONLY on explicit request. In the agent sandbox a WebDriver POST sent
  // straight to BrowserStack is 400'd by the egress firewall, so the shim (which re-frames the
  // request over node:https) is the safe default and never needs opting into.
  if (process.env.EM_BRIDGE_TARGET === 'browserstack') {
    const user = process.env.BROWSERSTACK_USERNAME
    const key = process.env.BROWSERSTACK_ACCESS_KEY
    if (!user || !key) {
      throw new Error('BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set for the browserstack target.')
    }
    return { hostname: process.env.BROWSERSTACK_HUB_HOST ?? 'hub-cloud.browserstack.com', port: 443, protocol: 'https', path: '/wd/hub', user, key } // prettier-ignore
  }

  // Default: the local shim (127.0.0.1:4723/wd/hub, started by bringup.sh). APPIUM_* override for a
  // real local Appium server (e.g. APPIUM_PATH=/ for Appium 2's default base path).
  return {
    hostname: process.env.APPIUM_HOST ?? '127.0.0.1',
    port: process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723,
    protocol: 'http',
    path: process.env.APPIUM_PATH ?? '/wd/hub',
  }
}

/**
 * Switch into the WKWebView context so DOM helpers (`execute`, `$`, `getSelection`) operate on the app.
 * Polls until the webview registers: a freshly launched App Automate session briefly reports only
 * `NATIVE_APP` before the Capacitor web layer comes up, so a single getContexts() can miss it and leave
 * the bridge stuck in the native context. Returns the context that was switched to.
 */
const ensureWebviewContext = async (session: WebdriverIO.Browser): Promise<string> => {
  let webview: string | undefined
  await session.waitUntil(
    async () => {
      // getContexts() returns either string ids or { id } objects depending on the backend; handle both.
      const contexts = (await session.getContexts()) as unknown as (string | { id: string })[]
      const ids = contexts.map(context => (typeof context === 'string' ? context : context.id))
      webview = ids.find(id => id.includes('WEBVIEW'))
      return !!webview
    },
    { timeout: 60000, interval: 1000, timeoutMsg: 'Timed out waiting for the iOS WEBVIEW context to appear.' },
  )
  // waitUntil already throws on timeout; this satisfies the type and guards against a future refactor.
  if (!webview) throw new Error('Timed out waiting for the iOS WEBVIEW context to appear.')
  await session.switchContext(webview)
  return webview
}

/**
 * Re-attach to the live session the agent created (BrowserStack App Automate via bringup.sh, or a
 * local Appium simulator session) and install it as the global `browser` that the iOS e2e helpers read.
 * This is the load-bearing seam of the executor bridge: the real helper code runs against the same live
 * session the agent is driving.
 *
 * Reads the session id from the session file (see `SESSION_FILE`) and the endpoint from the environment
 * (see `resolveEndpoint`).
 */
export const attachExistingSession = async (): Promise<WebdriverIO.Browser> => {
  const sessionId = readFileSync(SESSION_FILE, 'utf8').trim()
  if (!sessionId) throw new Error(`No session id found in ${SESSION_FILE}.`)

  const endpoint = resolveEndpoint()
  const session = await attach({
    sessionId,
    // Connection details must go under `options`: webdriverio's attach() derives the request endpoint
    // from detectBackend(attachOptions.options), and that result overrides any top-level keys.
    options: endpoint as WebdriverIO.Browser['options'],
    // Session flags so webdriverio registers the Appium/mobile commands (getContexts, switchContext, …)
    // it would otherwise only add after detecting a mobile session at session-create time.
    isMobile: true,
    isIOS: true,
    isW3C: true,
    capabilities: { platformName: 'iOS', 'appium:automationName': 'XCUITest' } as WebdriverIO.Capabilities,
  })

  globalThis.browser = session
  await ensureWebviewContext(session)
  return session
}

export default attachExistingSession
