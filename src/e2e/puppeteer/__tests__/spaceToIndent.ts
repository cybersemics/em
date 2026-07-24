import exportThoughts from '../helpers/exportThoughts'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Simulates pressing the space bar on an Android soft keyboard.
 * Android/GBoard reports the space keydown as keyCode 229 ('Unidentified'), so the space-to-indent
 * command never matches in the global keydown handler. The space is instead delivered as a cancelable
 * `beforeinput` (insertText ' ') on the editable, which is what this dispatches. */
const pressSpaceAndroid = () =>
  page.evaluate(() => {
    const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
    editable.focus()
    const range = document.createRange()
    range.selectNodeContents(editable)
    range.collapse(true)
    const selection = window.getSelection()
    selection!.removeAllRanges()
    selection!.addRange(range)
    editable.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'insertText', data: ' ', bubbles: true, cancelable: true }),
    )
  })

describe('space-to-indent', () => {
  // https://github.com/cybersemics/em/issues/4178
  it.skip('space on an empty thought indents it as a subthought on Android', async () => {
    await newThought('A')
    await press('Enter')
    await waitForEditable('')

    await pressSpaceAndroid()

    const exported = await exportThoughts()
    expect(exported).toBe(`
- A
  - 
`)
  })
})
