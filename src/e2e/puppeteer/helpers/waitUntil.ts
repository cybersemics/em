import { Page } from 'puppeteer'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitUntil = <R>(page: Page, f: () => R) => page.waitForFunction(f)

export default waitUntil
