import keyboard from './keyboard'
import press from './press'
import waitForEditable from './waitForEditable'

/** Creates a new thought by hitting Enter and typing text. Waits for renders between each step. */
const newThought = async (value?: string) => {
  await press('Enter')
  await waitForEditable('', { timeout: 1000 })
  if (value) {
    await keyboard.type(value)
    try {
      await waitForEditable(value, { timeout: 1000 })
    } catch (e) {
      console.warn(e)
      console.warn(
        `Timed out waiting for typed value "${value}" to appear. This is a bug. Did the browser selection not get set properly? Was the component re-rendered after waitForEditable but before typing? Retrying...`,
      )
      const editableNode = await waitForEditable('', { timeout: 1000 })
      // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
      await editableNode.asElement()?.click()
      await keyboard.type(value)
      await waitForEditable(value, { timeout: 1000 })
    }
  }
}

export default newThought
