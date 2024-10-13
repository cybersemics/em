import { KeyInput, Keyboard } from 'puppeteer'
import { page } from '../setup'

type Options = Parameters<Keyboard['press']>[1]

/** Presses a key on the keyboad. */
const press = (key: KeyInput, options?: Options) => page.keyboard.press(key, options)

export default press
