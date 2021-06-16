import { Page } from 'puppeteer'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitForFunction = <T extends any[], R>(page: Page, f: (...args: T) => R) =>
  page.waitForFunction(f)

export default waitForFunction
