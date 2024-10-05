import { Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

/** Type text on the keyboard. */
const type = (text: string) => global.page.keyboard.type(text)

export default type
