import { Page } from 'puppeteer'
import waitForEditable from './waitForEditable'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Creates a new thought by hitting Enter and typing text. Waits for renders between each step. */
const newThought = async (value?: string) => {
  const page = global.page
  await page.keyboard.press('Enter')
  await waitForEditable('')
  if (value) {
    await page.keyboard.type(value)
    await waitForEditable(value)
  }
}

export default newThought
