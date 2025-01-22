import keyboard from './keyboard'
import press from './press'
import waitForEditable from './waitForEditable'

/** Creates a new thought by hitting Enter and typing text. Waits for renders between each step. */
const newThought = async (value?: string) => {
  await press('Enter')
  await waitForEditable('')
  if (value) {
    await keyboard.type(value)
    await waitForEditable(value)
  }
}

export default newThought
