import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(f: () => R) => global.page.waitForFunction(f)

export default waitUntil
