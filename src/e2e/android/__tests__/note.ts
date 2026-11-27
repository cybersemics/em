import isKeyboardShown from '../../iOS/helpers/isKeyboardShown'
import paste from '../../iOS/helpers/paste'
import waitUntil from '../../iOS/helpers/waitUntil'
import getPageToScreen from '../helpers/getPageToScreen'
import touchPath from '../helpers/touchPath'

describe('note', () => {
  // https://github.com/cybersemics/em/issues/6393
  it.skip('the caret handle follows the finger out of a note and back', async () => {
    await paste(`
      - Aaa
        - =note
          - Bbb ccc
    `)
    await browser.$('[aria-label="note-editable"]').waitForExist()
    const pageToScreen = await getPageToScreen()

    const points = await browser.execute(() => {
      const note = document.querySelector('[aria-label="note-editable"]')!
      const text = note.firstChild!
      /** Returns the rect of a collapsed range at the given offset in the note's text. */
      const caretRect = (offset: number) => {
        const range = document.createRange()
        range.setStart(text, offset)
        range.collapse(true)
        return range.getClientRects()[0]
      }
      const between = caretRect(4)
      const end = caretRect(text.textContent!.length)
      const bullet = document.querySelector('[aria-label="bullet"]')!.getBoundingClientRect()
      // Chrome draws the caret handle just below the caret.
      const handleY = between.bottom + 12
      return {
        tap: { x: between.left, y: (between.top + between.bottom) / 2 },
        handle: { x: between.left, y: handleY },
        outside: { x: bullet.left - 10, y: handleY },
        end: { x: end.left + 10, y: handleY },
      }
    })

    // place the caret between "Bbb" and "ccc"
    await touchPath([pageToScreen(points.tap)])
    await waitUntil(isKeyboardShown)

    // drag the caret handle past the bullet and back past the end of the text without lifting
    await touchPath([points.handle, points.outside, points.end].map(pageToScreen))

    const caret = await browser.execute(() => {
      const note = document.querySelector('[aria-label="note-editable"]')!
      const selection = window.getSelection()!
      if (!selection.focusNode || !note.contains(selection.focusNode)) return null
      const range = document.createRange()
      range.selectNodeContents(note)
      range.setEnd(selection.focusNode, selection.focusOffset)
      return { focused: document.activeElement === note, offset: range.toString().length }
    })
    expect(caret).toEqual({ focused: true, offset: 'Bbb ccc'.length })
    expect(await isKeyboardShown()).toBe(true)
  })
})
