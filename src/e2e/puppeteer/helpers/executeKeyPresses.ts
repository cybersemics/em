import { KeyInput } from 'puppeteer'
import press from '../helpers/press'

/** Sequentially executes a list of key presses. */
const executeKeyPresses = async (keys: KeyInput[]) => {
  for (const k of keys) {
    await press(k as KeyInput)
  }
}

export default executeKeyPresses
