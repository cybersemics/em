import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

interface Options {
  timeout?: number
}

/**
 * Wait for editable div that contains the given value.
 */
const waitForEditable = async (value: string, { timeout }: Options = { timeout: 6000 }) =>
  await global.page.waitForFunction(
    (value: string) => {
      return Array.from(document.querySelectorAll('[data-editable]')).find(element => element.innerHTML === value)
    },
    {
      timeout,
    },
    value,
  )

export default waitForEditable
