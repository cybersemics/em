/**
 * Executes a function at an interval until it returns truthy.
 * Uses the global browser object from WDIO.
 */
const waitUntil = <R>(f: () => Promise<R>): Promise<boolean> =>
  browser.waitUntil(f as unknown as () => Promise<boolean>) as Promise<boolean>

export default waitUntil
