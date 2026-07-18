import { importTextActionCreator as importText } from '../../actions/importText'
import globals from '../../globals'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorBackTableCommand from '../cursorBackTable'

const tableText = `
  - a
    - =view
      - Table
    - b
      - c
    - d
      - e
`

/** Synthetic keyboard event for a discrete (non-repeat) ArrowLeft press. */
const pressEvent = { key: 'ArrowLeft', repeat: false } as unknown as KeyboardEvent

/** Synthetic keyboard event for a held (auto-repeat) ArrowLeft press. */
const repeatEvent = { key: 'ArrowLeft', repeat: true } as unknown as KeyboardEvent

beforeEach(initStore)
beforeEach(() => {
  globals.arrowKeyBoundaryCross = null
})

describe('cursorBackTable', () => {
  it('moves the cursor from a col2 thought to its col1 parent with the caret at the end', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b', 'c'])])

    cursorBackTableCommand.exec(store.dispatch, store.getState, pressEvent, { type: 'keyboard' })

    const state = store.getState()
    expect(state.cursor && headValue(state, state.cursor)).toBe('b')
    // the caret should land at the end of the col1 thought
    expect(state.cursorOffset).toBe('b'.length)
  })

  it('sets the boundary-cross suppression flag when crossing on a discrete keyboard press', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b', 'c'])])

    cursorBackTableCommand.exec(store.dispatch, store.getState, pressEvent, { type: 'keyboard' })

    expect(globals.arrowKeyBoundaryCross).toBe('ArrowLeft')
  })

  it('does not cross the boundary on auto-repeat (held key)', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b', 'c'])])

    cursorBackTableCommand.exec(store.dispatch, store.getState, repeatEvent, { type: 'keyboard' })

    const state = store.getState()
    // the cursor should remain on the col2 thought
    expect(state.cursor && headValue(state, state.cursor)).toBe('c')
    // and the suppression flag should not be set by a repeat
    expect(globals.arrowKeyBoundaryCross).toBeNull()
  })
})
