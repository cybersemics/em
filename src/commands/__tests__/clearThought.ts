import { fireEvent } from '@testing-library/dom'
import { act } from 'react'
import { formatSelectionActionCreator as formatSelection } from '../../actions/formatSelection'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import getThoughtById from '../../selectors/getThoughtById'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import { setCursorFirstMatchActionCreator } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import headValue from '../../util/headValue'
import clearThoughtCommand from '../clearThought'
import cursorBackCommand from '../cursorBack'

beforeEach(initStore)

/**
 * This has been moved to the top because the rest of the tests aren't getting cleaned up.
 * This should be properly fixed at some point.
 */
describe('clearThought', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('sets noteFocus to false when executing clearThought while noteFocus is true', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
            - a
              - =note
                - b
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
      ])
    })

    const { cursor } = store.getState()

    await act(async () => {
      store.dispatch([setCursor({ path: cursor, noteFocus: true })])
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the focus is on the note initially.
    const { noteFocus: initialNoteFocus } = store.getState()
    expect(initialNoteFocus).toBe(true)

    await act(async () => {
      executeCommand(clearThoughtCommand)
    })

    await act(vi.runOnlyPendingTimersAsync)

    // This ensures that the focus is no longer on the note.
    const { noteFocus } = store.getState()
    expect(noteFocus).toBe(false)
  })

  // https://github.com/cybersemics/em/issues/4830
  it('cancels clear thought mode on Escape and keeps the cursor', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
            - hello
          `,
        }),
        setCursorFirstMatchActionCreator(['hello']),
      ])
    })

    await act(async () => {
      executeCommand(clearThoughtCommand)
    })

    await act(vi.runOnlyPendingTimersAsync)

    expect(store.getState().cursorCleared).toBe(true)

    await act(async () => {
      cursorBackCommand.exec(store.dispatch, store.getState, {} as KeyboardEvent, { type: 'keyboard' })
    })

    await act(vi.runOnlyPendingTimersAsync)

    const state = store.getState()
    expect(state.cursorCleared).toBe(false)
    expect(state.cursor && headValue(state, state.cursor)).toBe('hello')
  })

  // The browser focuses the editing host implicitly when the browser selection is set on it, but only while
  // nothing else holds the focus. asyncFocus() parks the focus on a hidden input, so after a drag-and-drop —
  // which clears the selection — the editable was left unfocused when Clear Thought placed the caret on it,
  // and the caret, the faux carets on the other selected thoughts, and the keyboard never appeared.
  // https://github.com/cybersemics/em/pull/4520
  it('focuses the editable that receives the caret when clearing a multiselection', async () => {
    await act(async () => {
      store.dispatch([
        importText({
          text: `
            - a
            - b
            - c
          `,
        }),
        setCursorFirstMatchActionCreator(['a']),
        addMulticursor(['a']),
        addMulticursor(['b']),
        addMulticursor(['c']),
      ])
    })

    // capture the editable before it is cleared, when it still renders its value
    const editable = await findThoughtByText('a')

    await act(async () => {
      executeCommandWithMulticursor(clearThoughtCommand, { store })
    })

    await act(vi.runOnlyPendingTimersAsync)

    expect(document.activeElement).toBe(editable)
  })

  // Typing into a cleared thought re-applies the formatting of the original value. Every mark must be transferred, not
  // just the outermost one.
  // https://github.com/cybersemics/em/issues/4629
  it('re-applies every formatting mark of the cleared thought to the newly typed text', async () => {
    await act(async () => {
      store.dispatch([importText({ text: '- aaa' }), setCursorFirstMatchActionCreator(['aaa'])])
    })

    await act(async () => {
      store.dispatch([
        formatSelection('bold'),
        formatSelection('underline'),
        formatSelection('strikethrough'),
        formatSelection('foreColor', 'red'),
      ])
    })

    await act(vi.runOnlyPendingTimersAsync)

    const state = store.getState()
    expect(getThoughtById(state, head(state.cursor!))!.value).toBe(
      '<font color="#ff573d"><strike><u><b>aaa</b></u></strike></font>',
    )

    await act(async () => {
      executeCommand(clearThoughtCommand)
    })

    await act(vi.runOnlyPendingTimersAsync)

    // type into the cleared thought, which renders as empty
    const editable = (await findThoughtByText(''))!
    editable.innerHTML = 'bbb'
    fireEvent.input(editable, { bubbles: true })

    await act(vi.runAllTimersAsync)

    const stateAfter = store.getState()
    expect(getThoughtById(stateAfter, head(stateAfter.cursor!))!.value).toBe(
      '<font color="#ff573d"><strike><u><b>bbb</b></u></strike></font>',
    )
  })
})
