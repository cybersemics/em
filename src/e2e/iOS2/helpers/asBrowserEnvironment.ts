import { Browser } from 'webdriverio'
import { BrowserEnvironment } from '../../browserEnvironment/types'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (browser: Browser<'async'>): BrowserEnvironment => ({
  // 'function' is required here because webdriverio uses 'this'
  execute: function (...args) {
    return browser.execute(...args)
  },
})

export default asBrowserEnvironment
