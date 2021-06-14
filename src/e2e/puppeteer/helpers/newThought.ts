import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

/** Creates a new thought by hitting Enter and typing text. Waits for renders between each step. */
const newThought = async (page: Page, value?: string) => {
  await page.keyboard.press('Enter')
  await waitForEditable(page, '')
  if (value) {
    await page.keyboard.type(value)
    await waitForEditable(page, value)
  }
}

export default newThought
