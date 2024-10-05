import { Page } from 'puppeteer'
import { BrowserEnvironment } from '../../browserEnvironment/types'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Converts a Page to a BrowserEnvironment. */
const asBrowserEnvironment = (): BrowserEnvironment => ({
  // assert UnwrapPromiseLike<R> to Promise<R>
  execute: <R>(f: () => R) => global.page.evaluate(f) as Promise<R>,
})

export default asBrowserEnvironment
