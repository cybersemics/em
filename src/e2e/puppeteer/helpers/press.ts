import { KeyInput, Keyboard, Page } from 'puppeteer'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

type Options = Parameters<Keyboard['press']>[1]

/** Presses a key on the keyboad. */
const press = (key: KeyInput, options?: Options) => global.page.keyboard.press(key, options)

export default press
