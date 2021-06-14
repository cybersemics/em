import { Page } from 'puppeteer'

const press = (page: Page, key: string) => page.keyboard.press(key)

export default press
