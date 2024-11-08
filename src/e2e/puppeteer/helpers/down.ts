import { KeyInput, Keyboard } from 'puppeteer'
import { page } from '../setup'

type Options = Parameters<Keyboard['down']>[1]

/** Holds down a key on the keyboad. */
const down = (key: KeyInput, options?: Options) => page.keyboard.down(key, options)

export default down
