import { KeyInput, Keyboard, Page } from 'puppeteer'

type Options = Parameters<Keyboard['press']>[1]

const press = (page: Page, key: KeyInput, options?: Options) => page.keyboard.press(key, options)

export default press
