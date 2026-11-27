import isKeyboardShown from '../../iOS/helpers/isKeyboardShown'
import paste from '../../iOS/helpers/paste'
import waitUntil from '../../iOS/helpers/waitUntil'
import getPageToScreen from '../helpers/getPageToScreen'
import touchPath from '../helpers/touchPath'

describe('note', () => {
  // https://github.com/cybersemics/em/issues/6393
  it('the caret handle follows the finger out of a note and back', async () => {
    await paste(`
      - Aaa
        - =note
          - Bbb ccc
    `)
    await browser.$('[aria-label="note-editable"]').waitForExist()
    const pageToScreen = await getPageToScreen()

    /** Measures, in the page, where to tap between "Bbb" and "ccc", and the path to drag the caret handle along. */
    const measure = () =>
      browser.execute(() => {
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
          innerHeight: window.innerHeight,
        }
      })

    // place the caret between "Bbb" and "ccc"
    const before = await measure()
    await touchPath(await pageToScreen([before.tap]))
    await waitUntil(isKeyboardShown)

    // The page can move when the keyboard opens, so the handle is measured after it has.
    const points = await measure()
    const path = await pageToScreen([points.handle, points.outside, points.end])
    // Records what the drag does to the page: a touchstart means it missed the caret handle, which Chrome consumes,
    // and the selection changes show where the caret went.
    await browser.execute(() => {
      const w = window as Window & { noteTestEvents?: string[] }
      const events: string[] = (w.noteTestEvents = [])
      const note = document.querySelector('[aria-label="note-editable"]')!
      document.addEventListener('selectionchange', () => {
        const selection = window.getSelection()!
        const node = selection.focusNode
        events.push(!node ? 'none' : note.contains(node) ? `note:${selection.focusOffset}` : `out:${node.nodeName}`)
      })
      window.addEventListener('touchstart', () => events.push('touchstart'), { capture: true, passive: true })
      window.addEventListener('focusout', () => events.push('focusout'), true)
    })

    // drag the caret handle past the bullet and back past the end of the text without lifting
    await touchPath(path)

    // Printed so that a failure on a device shows whether the drag missed the handle and where the caret went.
    const events = await browser.execute(() => (window as Window & { noteTestEvents?: string[] }).noteTestEvents)
    console.info(`note caret handle: ${JSON.stringify({ before, after: points, path, events })}`)

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
