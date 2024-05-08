import { Page } from 'puppeteer'

interface Options {
  timeout?: number
}

/**
 * Wait for editable div that contains the given value.
 */
const waitForEditable = async (page: Page, value: string, { timeout }: Options = { timeout: 6000 }) =>
  await page.waitForFunction(
    (value: string) => {
      return Array.from(document.getElementsByClassName('editable')).find(element => element.innerHTML === value)
    },
    {
      timeout,
    },
    value,
  )

export default waitForEditable
