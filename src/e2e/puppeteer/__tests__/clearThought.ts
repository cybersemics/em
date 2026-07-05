import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Reads the innerHTML of every rendered thought editable. */
const editableValues = () => page.$$eval('[data-editable]', els => els.map(el => el.innerHTML))

describe('clearThought', () => {
  // Regression test for https://github.com/cybersemics/em/issues/4519
  // .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
  it.skip('clears all multiselected thoughts and mirrors typing across them', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    // Clear Thought (→←): Cmd/Ctrl + Option + Shift + C
    await press('c', { alt: true, shift: true, meta: true })

    // All three multiselected thoughts should be cleared (rendered as empty placeholders).
    // Bounded wait so the assertion below surfaces a diff instead of a bare timeout when it fails.
    const clearedValues = await page
      .waitForFunction(
        () => {
          const els = Array.from(document.querySelectorAll('[data-editable]'))
          return els.length === 3 && els.every(el => el.innerHTML === '') ? els.map(el => el.innerHTML) : false
        },
        { timeout: 6000 },
      )
      .then(handle => handle.jsonValue() as Promise<string[]>)
      .catch(() => editableValues())
    expect(clearedValues).toEqual(['', '', ''])

    // Typing should mirror the new value across all cleared thoughts in real-time.
    await page.keyboard.type('hello')

    const mirroredValues = await page
      .waitForFunction(
        () => {
          const els = Array.from(document.querySelectorAll('[data-editable]'))
          return els.length === 3 && els.every(el => el.innerHTML === 'hello') ? els.map(el => el.innerHTML) : false
        },
        { timeout: 6000 },
      )
      .then(handle => handle.jsonValue() as Promise<string[]>)
      .catch(() => editableValues())
    expect(mirroredValues).toEqual(['hello', 'hello', 'hello'])
  })
})
