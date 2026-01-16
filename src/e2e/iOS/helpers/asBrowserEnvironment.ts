import type { BrowserEnvironment } from '../../browserEnvironment/types.js'

/**
 * Converts the global browser to a BrowserEnvironment.
 * Uses the global browser object from WDIO.
 */
const asBrowserEnvironment = (): BrowserEnvironment => ({
  // 'function' is required here because webdriverio uses 'this'
  execute: function <R>(f: () => R) {
    return browser.execute(f) as Promise<R>
  },
})

export default asBrowserEnvironment
