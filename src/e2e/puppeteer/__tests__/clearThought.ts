import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Executes Clear Thought (→←) with its keyboard shortcut. The command helper is not used because it executes the
 * command directly, bypassing the multicursor execution that this test exercises. */
const clearThought = () => press('c', { alt: true, shift: true, meta: true })

/** Reads the innerHTML of every rendered thought. */
const editableValues = () => page.$$eval('[data-editable]', els => els.map(el => el.innerHTML))

/** Waits for the first thought to render the given value. Since an edit is mirrored to the other selected thoughts in
 * the same dispatch, they render it in the same frame. */
const waitForFirstEditable = (value: string) =>
  page.waitForFunction(value => document.querySelector('[data-editable]')?.innerHTML === value, {}, value)

/** Waits until no thoughts are rendered. */
const waitForNoEditables = () => page.waitForFunction(() => !document.querySelector('[data-editable]'))

/** Returns the index of the thought that holds the real caret, or -1 if no thought is being edited. */
const editingIndex = () =>
  page.evaluate(() => {
    const editables = Array.from(document.querySelectorAll('[data-editable]'))
    const editing = document.querySelector('[data-editing=true] [data-editable]')
    return editing ? editables.indexOf(editing) : -1
  })

/** Returns the x position of the real caret and of each faux caret. */
const caretPositions = () =>
  page.evaluate(() => ({
    real: getSelection()?.getRangeAt(0).getClientRects()[0]?.x ?? null,
    faux: Array.from(document.querySelectorAll('[data-testid="faux-caret-multicursor"]')).map(
      el => el.lastElementChild!.firstElementChild!.getBoundingClientRect().x,
    ),
  }))

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

    await clearThought()

    // All three multiselected thoughts are cleared, i.e. rendered as empty placeholders.
    await waitForFirstEditable('')
    expect(await editableValues()).toEqual(['', '', ''])

    // The real caret is on the first thought and a faux caret is rendered on the other two.
    expect(await editingIndex()).toBe(0)
    expect((await caretPositions()).faux).toHaveLength(2)

    // Typing mirrors the new value across all cleared thoughts in real-time.
    await page.keyboard.type('hello')
    await waitForFirstEditable('hello')
    expect(await editableValues()).toEqual(['hello', 'hello', 'hello'])

    // Backspace deletes a character rather than the thoughts, and the deletion mirrors like any other edit.
    await page.keyboard.press('Backspace')
    await waitForFirstEditable('hell')
    expect(await editableValues()).toEqual(['hell', 'hell', 'hell'])

    // The faux carets track the real caret character by character.
    const carets = await caretPositions()
    expect(carets.real).not.toBeNull()
    expect(carets.faux).toHaveLength(2)
    // allow sub-pixel rounding between the browser's caret rect and the laid-out faux caret
    carets.faux.forEach(x => expect(x).toBeCloseTo(carets.real!, 0))
  })

  // Regression test for https://github.com/cybersemics/em/issues/4519
  it('deletes all multiselected thoughts when Backspace is pressed on the empty thoughts', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')

    await multiselectThoughts(['a', 'b', 'c'])

    await clearThought()
    await waitForFirstEditable('')

    // Empty the thoughts by typing and deleting the text, since a cleared thought still has its old value until it is
    // edited.
    await page.keyboard.type('hi')
    await waitForFirstEditable('hi')
    await press('Backspace')
    await press('Backspace')
    await waitForFirstEditable('')
    expect(await editableValues()).toEqual(['', '', ''])

    // Backspace on the empty thoughts deletes every selected thought, not just the one that holds the caret.
    await press('Backspace')
    await waitForNoEditables()
  })
})
