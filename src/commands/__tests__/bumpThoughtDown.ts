import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand, executeCommandWithMulticursor } from '../../commands'
import bumpThoughtDown from '../../commands/bumpThoughtDown'
import { AlertType, HOME_TOKEN } from '../../constants'
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
  // https://github.com/cybersemics/em/issues/3134
  it('bumps the parent of the selected thoughts down and moves the selected thoughts into it', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
            - d
            - e
            - f`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
      addMulticursor(['a', 'd']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
      - b
      - c
      - d
    - e
    - f`)
  })

  it('bumps a single selected thought down', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - x
            - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - ${''}
      - b
      - x
    - c`)
  })

  it('moves the selected thoughts into a new empty thought when they are in the home context', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c`,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
    - b
  - c`)
  })

  it('sets the cursor on the new empty thought and clears the multicursor', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    const state = store.getState()

    // The caret belongs on the bumped parent's empty replacement, ready to type its new value,
    // just as when the command is executed without a multiselect.
    expectPathToEqual(state, state.cursor, [''])
    expect(hasMulticursor(state)).toBeFalse()
  })

  it('reverts the bump on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
            - d`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    // Precondition: the bump occurred, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - ${''}
    - a
      - b
      - c
    - d`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
    - c
    - d`)
  })

  it('disallows bumping down thoughts from different parents', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
          - c
            - d`,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(bumpThoughtDown, { store })

    expect(store.getState().alert).toMatchObject({
      alertType: AlertType.MulticursorError,
      value: 'Cannot bump down thoughts from different parents.',
    })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - b
  - c
    - d`)
  })
})
