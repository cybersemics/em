import { Page } from 'puppeteer'

const type = (page: Page, text: string) => page.keyboard.type(text)

export default type
