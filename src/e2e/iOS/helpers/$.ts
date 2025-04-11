import { Browser } from 'webdriverio'

/** Performs a querySelector on the document. */
const $ = (browser: Browser, selector: string) => browser.$(selector)

export default $
