import { Browser } from 'webdriverio'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(browser: Browser<'async'>, f: () => Promise<R>): Promise<boolean> =>
  browser.waitUntil(f as unknown as () => Promise<boolean>) as Promise<boolean>

export default waitUntil
