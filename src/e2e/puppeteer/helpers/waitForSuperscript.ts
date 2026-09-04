import { page } from '../session'

const selector = "[data-editing=true] [role='superscript']"

/** Waits for the superscript of the thought under the cursor to render, and returns its text. Times out after 6 seconds. */
const waitForSuperscript = async (): Promise<string | null> => {
  await page.waitForFunction((selector: string) => document.querySelector(selector), { timeout: 6000 }, selector)
  return page.evaluate((selector: string) => document.querySelector(selector)?.textContent ?? null, selector)
}

export default waitForSuperscript
