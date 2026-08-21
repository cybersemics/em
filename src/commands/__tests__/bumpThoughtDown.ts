import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import bumpThoughtDown from '../../commands/bumpThoughtDown'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

describe('DOM', () => {
  beforeEach(createTestApp)
  afterEach(cleanupTestApp)

  it('reset content editable inner html on bumpThoughtDown', async () => {
    await dispatch([
      importText({
        text: `
        - a
          - b`,
      }),
      setCursor(['a']),
    ])

    await act(vi.runOnlyPendingTimersAsync)

    expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('a')

    await act(async () => {
      executeCommand(bumpThoughtDown)
    })

    await act(vi.runOnlyPendingTimersAsync)

    expect(document.querySelector(`div[data-editable]`)?.textContent).toBe('')
  })
})

describe('multicursor', () => {
  it('bumps each selected thought down into a new empty thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - 
    - a
    - b
  - 
    - c
    - d`)
  })

  it('bumps selected thoughts at different depths', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
              - e
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - 
      - b
  - c
    - 
      - d
      - e`)
  })

  it('bumps each selected sibling down into its own empty thought', () => {
    store.dispatch([
      importText({
        text: `
          - p
            - a
            - b
        `,
      }),
      setCursor(['p', 'a']),
      addMulticursor(['p', 'a']),
      addMulticursor(['p', 'b']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    // A childless thought is bumped via the categorize path, which creates a new empty parent for it.
    // Each sibling must get its own empty parent rather than being grouped under a single one.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - p
    - 
      - a
    - 
      - b`)
  })

  it('bumps a selected parent and its selected child', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - c
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    // a is bumped first, moving its value into a new first child. b's path is recomputed through the
    // now-empty parent before b is bumped in turn.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - 
    - a
    - 
      - b
      - c`)
  })

  it('sets the cursor on the new empty thought when a single selected thought is bumped', () => {
    store.dispatch([
      importText({
        text: `
          - p
            - a
        `,
      }),
      setCursor(['p', 'a']),
      addMulticursor(['p', 'a']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - p
    - 
      - a`)

    // The caret belongs on the new empty thought, ready to type the bumped thought's replacement,
    // just as when the command is executed without a multiselect.
    expectPathToEqual(state, state.cursor, ['p', ''])
    expect(hasMulticursor(state)).toBeFalse()
  })

  it('sets the cursor on the last bumped empty thought and clears the multicursor', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
              - e
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const state = store.getState()

    // d is the last selected thought in document order, so the caret ends on its empty replacement.
    expectPathToEqual(state, state.cursor, ['c', ''])
    expect(hasMulticursor(state)).toBeFalse()
  })

  it('reverts every bump on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d
          - e
            - f
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c']),
      addMulticursor(['e']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    // Precondition: all three bumps occurred, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - 
    - a
    - b
  - 
    - c
    - d
  - 
    - e
    - f`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d
  - e
    - f`)
  })
})
