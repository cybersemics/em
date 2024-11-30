import { WaitForSelectorOptions } from 'puppeteer'
import { page } from '../setup'

/** Waits until a specific selector is visible in the page context. */
const waitForSelector = (selector: string, options: WaitForSelectorOptions = { visible: true }) => {
  return page.waitForSelector(selector, options)
}

export default waitForSelector
