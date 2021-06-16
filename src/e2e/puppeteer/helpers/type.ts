import { Page } from 'puppeteer'

/** Type text on the keyboard. */
const type = (page: Page, text: string) => page.keyboard.type(text)

export default type
