import { page } from '../setup'

interface Options {
  timeout?: number
}

/**
 * Wait for editable div that contains the given value. Times out after 6 seconds.
 */
const waitForEditable = async (
  value: string,
  { timeout }: Options = {
    // 6 seconds can seem like a long time to wait, but even the round trip to the browser for clicking a thought can sometimes exceed 1–2 seconds when there are any tests running in parallel.
    timeout: 6000,
  },
) =>
  await page.waitForFunction(
    (value: string) => {
      return Array.from(document.querySelectorAll('[data-editable]')).find(element => element.innerHTML === value)
    },
    {
      timeout,
    },
    value,
  )

export default waitForEditable
