import { createEvent, fireEvent } from '@testing-library/dom'
import { render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import Path from '../../@types/Path'
import { importTextActionCreator as importText } from '../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../actions/keyboardOpen'
import globals from '../../globals'
import contextToPath from '../../selectors/contextToPath'
import store from '../../stores/app'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import Note from '../Note'

// Emulate iOS Safari, which sometimes synthesizes the focus of a tap even though touchend called preventDefault
// (e.g. a non-cancelable touchend during scroll momentum). See globals.suppressCursorAfterTouch.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return {
    ...actual,
    isTouch: true,
    isSafari: () => true,
  }
})

beforeEach(initStore)

afterEach(() => {
  globals.suppressCursorAfterTouch = false
})

// https://github.com/cybersemics/em/issues/4827
it('keep the keyboard closed when iOS Safari synthesizes the focus of the first tap on a note', async () => {
  await dispatch([
    importText({
      text: `
        - a
        - b
          - =note
            - test`,
    }),
    setCursor(['a']),
    keyboardOpen({ value: false }),
  ])

  const path = contextToPath(store.getState(), ['b']) as Path
  const { getByLabelText } = render(createElement(Provider, { store, children: createElement(Note, { path }) }))
  const noteEditable = getByLabelText('note-editable')

  // The first tap moves the cursor to the note's thought and suppresses the tap's synthesized focus.
  const touchend = createEvent.touchEnd(noteEditable)
  act(() => {
    fireEvent(noteEditable, touchend)
  })

  expect(touchend.defaultPrevented).toBe(true)
  expectPathToEqual(store.getState(), store.getState().cursor, ['b'])
  expect(store.getState().isKeyboardOpen).toBe(false)

  // iOS Safari synthesizes the focus anyway. It must not be treated as the second tap that opens the keyboard.
  act(() => {
    fireEvent.focus(noteEditable)
  })
  await act(vi.runAllTimersAsync)

  expect(store.getState().isKeyboardOpen).toBe(false)
  expect(store.getState().noteFocus).toBe(false)
  expectPathToEqual(store.getState(), store.getState().cursor, ['b'])
})
