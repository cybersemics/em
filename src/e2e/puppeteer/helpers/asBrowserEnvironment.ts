import { Page } from 'puppeteer'
import { BrowserEnvironment } from '../../test-types'

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (page: Page): BrowserEnvironment => ({
  // assert UnwrapPromiseLike<R> to Promise<R>
  execute: <R>(f: () => R) => page.evaluate(f) as Promise<R>
})

export default asBrowserEnvironment
