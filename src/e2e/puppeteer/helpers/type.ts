import { Page } from 'puppeteer'

const press = (page: Page, text: string) => page.keyboard.type(text)

export default press
