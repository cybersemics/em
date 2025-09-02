import { Browser } from 'webdriverio'
import { BrowserEnvironment } from '../../browserEnvironment/types'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (browser: Browser): BrowserEnvironment => ({
  // 'function' is required here because webdriverio uses 'this'
  execute: function <R>(f: () => R) {
    return browser.execute(f) as Promise<R>
  },
})

export default asBrowserEnvironment
