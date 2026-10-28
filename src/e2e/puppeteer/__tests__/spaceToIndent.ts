import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import multiselectThoughts from '../helpers/multiselectThoughts'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitForNoteFocus from '../helpers/waitForNoteFocus'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('space-to-indent', () => {
  // https://github.com/cybersemics/em/issues/4178
  it('indents an empty thought when Android delivers space as a beforeinput insertText', async () => {
    // create thought A, then a new empty thought below it
    await newThought('A')
    await press('Enter')
    await waitForEditable('')

    // On Android the soft keyboard reports the space keydown as keyCode 229 ('Unidentified'), so the space
    // never matches the indent command in keyDown — it arrives only as a `beforeinput` insertText. Simulate
    // that native delivery directly on the focused editable (the window `beforeinput` listener handles it).
    await page.evaluate(() => {
      document.activeElement?.dispatchEvent(
        new InputEvent('beforeinput', { inputType: 'insertText', data: ' ', bubbles: true, cancelable: true }),
      )
    })

    // The indent lands asynchronously, and both thoughts are leaves until it does. A parent bullet appearing
    // is the visible signal that A gained a child.
    await waitUntil(() => !!document.querySelector('[data-bullet="parent"]'), { timeout: 6000 })

    // the empty thought should be indented as a subthought of A (its previous sibling), not left as a
    // sibling containing a literal space
    const exported = await exportThoughts()
    expect(exported).toBe(`
- A
  - 
`)
  })

  // https://github.com/cybersemics/em/issues/5969
  it('inserts a space typed in the note of an empty thought instead of indenting the thought', async () => {
    await newThought('a')
    await press('Enter')
    await waitForEditable('')

    await press('n', { meta: true, alt: true })
    await waitForNoteFocus()
    await keyboard.type('The only')

    const exported = await exportThoughts()
    expect(exported).toBe(`
- a
- 
  - =note
    - The only
`)
  })

  // https://github.com/cybersemics/em/issues/5969
  it('inserts a space typed in the note of a multiselected empty thought instead of indenting the thought', async () => {
    await newThought('a')
    await newThought('b')
    await press('Enter')
    await waitForEditable('')

    await multiselectThoughts(['b', ''])
    await press('n', { meta: true, alt: true })
    await waitForNoteFocus()
    await keyboard.type('The only')

    const exported = await exportThoughts()
    expect(exported).toBe(`
- a
- b
  - =note
    - 
- 
  - =note
    - The only
`)
  })
})
