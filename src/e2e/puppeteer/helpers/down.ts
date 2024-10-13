import { KeyInput, Keyboard } from 'puppeteer'
import { fetchPage } from './setup'

type Options = Parameters<Keyboard['down']>[1]

/** Holds down a key on the keyboad. */
const down = (key: KeyInput, options?: Options) => fetchPage().keyboard.down(key, options)

export default down
