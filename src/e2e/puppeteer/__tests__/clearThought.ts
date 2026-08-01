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
  it('clears all multiselected thoughts and mirrors typing across them', async () => {
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

    // A faux caret should be rendered on the two non-cursor thoughts (the first thought holds the real caret).
    const fauxCaretCount = await page.$$eval('[data-testid="faux-caret-multicursor"]', els => els.length)
    expect(fauxCaretCount).toBe(2)

    // The real caret (editing cursor) should be on the first thought.
    const editingIndex = await page.evaluate(() => {
      const editables = Array.from(document.querySelectorAll('[data-editable]'))
      const editing = document.querySelector('[data-editing=true] [data-editable]')
      return editing ? editables.indexOf(editing) : -1
    })
    expect(editingIndex).toBe(0)

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

    // Backspace should delete a character rather than being hijacked by the multiselect delete command, and the
    // deletion should mirror across the multiselection like any other edit.
    await page.keyboard.press('Backspace')

    const backspacedValues = await page
      .waitForFunction(
        () => {
          const els = Array.from(document.querySelectorAll('[data-editable]'))
          return els.length === 3 && els.every(el => el.innerHTML === 'hell') ? els.map(el => el.innerHTML) : false
        },
        { timeout: 6000 },
      )
      .then(handle => handle.jsonValue() as Promise<string[]>)
      .catch(() => editableValues())
    expect(backspacedValues).toEqual(['hell', 'hell', 'hell'])

    // The faux carets should still be rendered after editing, at the same x position as the real caret so that they
    // track it character by character.
    const caretPositions = await page.evaluate(() => {
      const selectionRect = getSelection()?.getRangeAt(0).getClientRects()[0]
      const fauxCaretXs = Array.from(document.querySelectorAll('[data-testid="faux-caret-multicursor"]')).map(
        el => el.lastElementChild!.firstElementChild!.getBoundingClientRect().x,
      )
      return { realCaretX: selectionRect?.x ?? null, fauxCaretXs }
    })
    expect(caretPositions.realCaretX).not.toBeNull()
    expect(caretPositions.fauxCaretXs).toHaveLength(2)
    // allow sub-pixel rounding between the browser's caret rect and the laid-out faux caret
    caretPositions.fauxCaretXs.forEach(x => expect(x).toBeCloseTo(caretPositions.realCaretX!, 0))
  })
})
