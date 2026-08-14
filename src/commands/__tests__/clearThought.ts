import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { setCursorActionCreator as setCursor } from '../../actions/setCursor'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import initStore from '../../test-helpers/initStore'
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
})

describe('multicursor', () => {
  it('clears the text of every selected thought while preserving descendants', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - x
          - b
            - y
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - ${''}
    - x
  - ${''}
    - y`)
  })

  it('clears selected thoughts at different depths', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - c
          - d
        `,
      }),
      setCursorFirstMatchActionCreator(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
      - c
  - ${''}`)
  })

  it('does not clear a selected divider', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - ---
          - b
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
      addMulticursor(['---']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - ${''}
  - ---
  - ${''}`)
  })

  it('enters the transient clear mode instead of editing when a single thought is selected', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const state = store.getState()

    // the transient mode is active and the persisted value is untouched
    expect(state.cursorCleared).toBe(true)
    expect(state.cursor && headValue(state, state.cursor)).toBe('a')
    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - b`)
  })

  it('toggles the transient clear mode off when executed again with a single selected thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    // Precondition: the first execution entered the transient clear mode, otherwise the second execution would enter it rather than toggle it off.
    expect(store.getState().cursorCleared).toBe(true)

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const state = store.getState()

    expect(state.cursorCleared).toBe(false)
    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a`)
  })

  it('keeps the cursor and multiselection on the cleared thoughts without entering the transient clear mode', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - x
          - b
            - y
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    // both cleared thoughts end up with the empty value, so compare the cursor by thought id rather than by value
    const cursorIdBefore = head(store.getState().cursor!)

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    const state = store.getState()

    expect(state.cursor && head(state.cursor)).toBe(cursorIdBefore)
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([[''], ['']])
    // the transient clear mode applies to a single cursor thought only and must not be activated by a multi-thought clear
    expect(state.cursorCleared).toBe(false)
  })

  it('restores the text of every cleared thought on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
            - x
          - c
        `,
      }),
      setCursorFirstMatchActionCreator(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(clearThoughtCommand, { store })

    // Precondition: all three thoughts were cleared, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - ${''}
  - ${''}
    - x
  - ${''}`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
    - x
  - c`)
  })
})
