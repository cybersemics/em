import { Page } from 'puppeteer'

/** Executes a function in the page context at an interval until it returns truthy. */
const waitForFunction = (page: Page) => page.waitForFunction

export default waitForFunction
