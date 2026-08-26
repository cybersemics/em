import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import { executeCommand } from '../../commands'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import multicursorValues from '../../test-helpers/multicursorValues'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorBackCommand from '../cursorBack'
import cursorDownCommand from '../cursorDown'

beforeEach(initStore)

/** Synthetic Shift+Down keyboard event. */
const shiftDownEvent = { shiftKey: true, preventDefault: () => {} } as unknown as KeyboardEvent

/** Focuses the given editable and places a collapsed caret in it, as clicking a thought does. */
const setCaret = (editable: HTMLElement) => {
  editable.focus()
  const range = document.createRange()
  range.setStart(editable.childNodes[0], 0)
  range.collapse(true)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

describe('cursorBack', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  // Shift + ArrowDown moves the cursor onto the next thought but leaves the caret behind in the thought the
  // multiselect started from, and only takes it away on the next animation frame. Escape must clear the
  // multiselect within that window rather than mistaking it for a multiselection that is being edited (Clear
  // Thought), which it exits while leaving the multiselection intact.
  // https://github.com/cybersemics/em/actions/runs/32523529894/job/96900697473
  it('clears a multiselect extended with Shift + ArrowDown while the caret is still in the first selected thought', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursor(['a']),
        keyboardOpen({ value: true }),
      ])
    })

    // place the caret in a, as clicking the thought does
    setCaret((await findThoughtByText('a'))!)

    // Hold back the animation frame in which cursorDown takes the caret away, and the blur that Editable
    // performs on the render that follows, so that Escape is executed within the window in which the caret is
    // still in a.
    const requestAnimationFrameMock = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    const blurMock = vi.spyOn(HTMLElement.prototype, 'blur').mockImplementation(() => {})

    try {
      await act(async () => {
        executeCommand(cursorDownCommand, { store, event: shiftDownEvent })
      })

      const state = store.getState()
      expect(multicursorValues()).toEqual(['a', 'b'])
      // the cursor is on b, but the caret is still in a
      expect(state.cursor && headValue(state, state.cursor)).toBe('b')
      expect(window.getSelection()?.focusNode?.textContent).toBe('a')

      await act(async () => {
        cursorBackCommand.exec(store.dispatch, store.getState, {} as KeyboardEvent, { type: 'keyboard' })
      })
    } finally {
      requestAnimationFrameMock.mockRestore()
      blurMock.mockRestore()
    }

    expect(multicursorValues()).toEqual([])
  })
})
