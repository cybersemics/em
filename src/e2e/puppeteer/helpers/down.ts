import { KeyInput, Keyboard, Page } from 'puppeteer'

type Options = Parameters<Keyboard['down']>[1]

/** Holds down a key on the keyboad. */
const down = (page: Page, key: KeyInput, options?: Options) => page.keyboard.down(key, options)

export default down
