import { Page } from 'puppeteer'

/**
 * Wait for editable div that contains the given value.
 */
const waitForEditable = async (page: Page, value: string) =>
  await page.waitForFunction((value: string) => {
    return Array.from(document.getElementsByClassName('editable'))
      .some(element => element.innerHTML === value)
  }, {}, value)

export default waitForEditable
