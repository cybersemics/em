import { KeyInput, Page } from 'puppeteer'

const press = (page: Page, key: KeyInput) => page.keyboard.press(key)

export default press
