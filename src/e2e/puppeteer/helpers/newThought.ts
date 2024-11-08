import { page } from '../setup'
import waitForEditable from './waitForEditable'

/** Creates a new thought by hitting Enter and typing text. Waits for renders between each step. */
const newThought = async (value?: string) => {
  await page.keyboard.press('Enter')
  await waitForEditable('')
  if (value) {
    await page.keyboard.type(value)
    await waitForEditable(value)
  }
}

export default newThought
