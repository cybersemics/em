import { page } from '../setup'

interface Options {
  timeout?: number
}

/**
 * Wait for alert content that includes the given text.
 */
const waitForAlertContent = async (text: string, { timeout }: Options = { timeout: 6000 }) =>
  await page.waitForFunction(
    (text: string) => {
      const alertElement = document.querySelector('[data-testid="alert-content"]')
      return alertElement?.textContent?.includes(text)
    },
    {
      timeout,
    },
    text,
  )

export default waitForAlertContent
