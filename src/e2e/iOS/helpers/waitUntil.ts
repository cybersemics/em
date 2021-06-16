import { Browser } from 'webdriverio'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(browser: Browser<'async'>, f: () => R): Promise<boolean> =>
  browser.waitUntil(() => !!f()) as Promise<boolean>

export default waitUntil
