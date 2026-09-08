import { page } from '../session'

interface Options {
  timeout?: number
}

/**
 * Wait for alert content that includes the given text. Reports the alert's actual text if it never arrives, which
 * distinguishes an alert that never rendered (null) from the wrong alert rendering in its place. Times out after 6
 * seconds.
 */
const waitForAlertContent = async (text: string, { timeout }: Options = { timeout: 6000 }) => {
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-testid="alert-content"]')?.textContent ?? null), {
      timeout,
    })
    .toEqual(expect.stringContaining(text))
}

export default waitForAlertContent
