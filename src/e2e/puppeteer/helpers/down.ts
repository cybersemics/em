import { KeyInput, Keyboard, Page } from 'puppeteer'

declare module global {
  const page: Page;
}

type Options = Parameters<Keyboard['down']>[1]

/** Holds down a key on the keyboad. */
const down = (key: KeyInput, options?: Options) => global.page.keyboard.down(key, options)

export default down
