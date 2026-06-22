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
 * Resolve the WebDriver endpoint for the live session. Defaults to a local Appium server; uses
 * BrowserStack when `EM_BRIDGE_TARGET=browserstack` or when BrowserStack credentials are present.
 * The BrowserStack host defaults to App Automate's `hub-cloud.browserstack.com`; override with
 * `BROWSERSTACK_HUB_HOST`.
 */
export const resolveEndpoint = (): Endpoint => {
  const browserstack =
    process.env.EM_BRIDGE_TARGET === 'browserstack' ||
    (!process.env.EM_BRIDGE_TARGET && !!process.env.BROWSERSTACK_USERNAME)

  if (browserstack) {
    const user = process.env.BROWSERSTACK_USERNAME
    const key = process.env.BROWSERSTACK_ACCESS_KEY
    if (!user || !key) {
      throw new Error('BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set for the browserstack target.')
    }
    return { hostname: process.env.BROWSERSTACK_HUB_HOST ?? 'hub-cloud.browserstack.com', port: 443, protocol: 'https', path: '/wd/hub', user, key } // prettier-ignore
  }

  // Local Appium (matches src/e2e/iOS/config/wdio.local.conf.ts defaults).
  return {
    hostname: process.env.APPIUM_HOST ?? '127.0.0.1',
    port: process.env.APPIUM_PORT ? parseInt(process.env.APPIUM_PORT, 10) : 4723,
    protocol: 'http',
    path: process.env.APPIUM_PATH ?? '/',
  }
}

/**
 * Switch into the WKWebView context so DOM helpers (`execute`, `$`, `getSelection`) operate on the app.
 * Returns the context that was switched to, if any. The session creator normally leaves the session in
 * the webview already; this makes the bridge robust to whatever context it was left in.
 */
const ensureWebviewContext = async (session: WebdriverIO.Browser): Promise<string | undefined> => {
  // getContexts() returns either string ids or { id } objects depending on the backend; handle both.
  const contexts = (await session.getContexts()) as unknown as (string | { id: string })[]
  const ids = contexts.map(context => (typeof context === 'string' ? context : context.id))
  const webview = ids.find(id => id.includes('WEBVIEW'))
  if (webview) await session.switchContext(webview)
  return webview
}

/**
 * Re-attach to the live session the agent created (BrowserStack App Automate via the wdio MCP, or a
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
