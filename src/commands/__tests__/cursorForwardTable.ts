import { importTextActionCreator as importText } from '../../actions/importText'
import globals from '../../globals'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorForwardTableCommand from '../cursorForwardTable'

const tableText = `
  - a
    - =view
      - Table
    - b
      - c
    - d
      - e
`

/** Synthetic keyboard event for a discrete (non-repeat) ArrowRight press. */
const pressEvent = { key: 'ArrowRight', repeat: false } as unknown as KeyboardEvent

/** Synthetic keyboard event for a held (auto-repeat) ArrowRight press. */
const repeatEvent = { key: 'ArrowRight', repeat: true } as unknown as KeyboardEvent

beforeEach(initStore)
beforeEach(() => {
  globals.arrowKeyBoundaryCross = null
})

describe('cursorForwardTable', () => {
  it('moves the cursor from a col1 thought to its col2 child', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b'])])

    cursorForwardTableCommand.exec(store.dispatch, store.getState, pressEvent, { type: 'keyboard' })

    const state = store.getState()
    expect(state.cursor && headValue(state, state.cursor)).toBe('c')
  })

  it('sets the boundary-cross suppression flag when crossing on a discrete keyboard press', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b'])])

    cursorForwardTableCommand.exec(store.dispatch, store.getState, pressEvent, { type: 'keyboard' })

    expect(globals.arrowKeyBoundaryCross).toBe('ArrowRight')
  })

  it('does not cross the boundary on auto-repeat (held key)', () => {
    store.dispatch([importText({ text: tableText }), setCursor(['a', 'b'])])

    cursorForwardTableCommand.exec(store.dispatch, store.getState, repeatEvent, { type: 'keyboard' })

    const state = store.getState()
    // the cursor should remain on the col1 thought
    expect(state.cursor && headValue(state, state.cursor)).toBe('b')
    // and the suppression flag should not be set by a repeat
    expect(globals.arrowKeyBoundaryCross).toBeNull()
  })
})
