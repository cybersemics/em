import { Browser } from 'webdriverio'
import { BrowserEnvironment } from '../../browserEnvironment/types'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (browser: Browser<'async'>): BrowserEnvironment => ({
  execute: browser.execute
})

export default asBrowserEnvironment
