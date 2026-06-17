import puppeteer, { type Browser, type Page } from 'puppeteer'
import { setPage } from './session'

/**
 * CDP endpoint of the shared Chrome. This is the same Chrome the chrome-devtools MCP attaches to
 * (configured with `--browser-url`), so the agent and the bridge act on one browser. Launch it with
 * `--remote-debugging-port=9222`. Override with `EM_BRIDGE_BROWSER_URL`.
 */
const BROWSER_URL = process.env.EM_BRIDGE_BROWSER_URL ?? 'http://127.0.0.1:9222'

/** Substring identifying the live em tab among the browser's open pages. Override with `EM_BRIDGE_URL_MATCH`. */
const URL_MATCH = process.env.EM_BRIDGE_URL_MATCH ?? 'localhost:3000'

/**
 * Connect to the shared Chrome over CDP, find the live em tab, and bind it as the helpers' `page`.
 *
 * This is the web counterpart of the iOS `attachExistingSession`: it gives a puppeteer client (which has
 * `page.touchscreen` / CDP touch) a handle on the same page the agent is driving via the chrome-devtools
 * MCP — so the real e2e helpers run against the agent's live browser. Returns the `browser` so the caller
 * can **disconnect** when done; never `close()` it — the MCP shares this Chrome.
 *
 * The page is used as-is (the agent has already navigated + emulated + dismissed the tutorial via the MCP);
 * the bridge does not create its own context.
 */
export const attachExistingBrowserInstance = async (): Promise<{ browser: Browser; page: Page }> => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL })
  const pages = await browser.pages()
  const target = pages.find(p => p.url().includes(URL_MATCH)) ?? pages.at(-1)
  if (!target) {
    await browser.disconnect()
    throw new Error(`No page matching "${URL_MATCH}" found in the shared Chrome at ${BROWSER_URL}.`)
  }
  setPage(target)
  return { browser, page: target }
}

export default attachExistingBrowserInstance
