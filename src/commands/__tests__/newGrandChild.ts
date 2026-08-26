import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import newGrandChildCommand from '../newGrandChild'

beforeEach(initStore)

describe('multicursor', () => {
  it('creates a new empty grandchild in each selected thought', () => {
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

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - ${''}
  - e
    - f
      - ${''}`)
  })

  it('appends the new grandchild to the existing children of the first subthought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
              - x
            - c
          - d
            - e
              - y
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - x
      - ${''}
    - c
  - d
    - e
      - y
      - ${''}`)
  })

  it('creates new grandchildren in selected thoughts at different depths', () => {
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
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['c', 'd']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - e
        - ${''}`)
  })

  it('skips a selected thought with no children while the rest of the selection proceeds', () => {
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
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    // a has no subthought to create a grandchild in, so the action is a no-op for it. b still gets its new grandchild.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
    - c
      - ${''}`)
  })

  it('places the caret in the last created empty grandchild and clears the multicursor', () => {
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

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    // the cursor must end in the new empty grandchild of the last selected thought, ready to type
    expectPathToEqual(state, state.cursor, ['c', 'd', ''])

    // the selection of parent thoughts is stale once the caret is in a new empty thought
    expect(state.multicursors).toEqual({})
  })

  it('places the caret in the new empty grandchild when a single thought is selected', () => {
    // on mobile, opening the Command Center selects the cursor thought, so a single selected thought is the common case
    store.dispatch([
      importText({
        text: `
          - a
            - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}`)

    expectPathToEqual(state, state.cursor, ['a', 'b', ''])
    expect(state.multicursors).toEqual({})
  })

  it('reverts every created grandchild on a single undo', () => {
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

    executeCommandWithMulticursor(newGrandChildCommand, { store })

    // Precondition: all three grandchildren were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
  - c
    - d
      - ${''}
  - e
    - f
      - ${''}`)

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
