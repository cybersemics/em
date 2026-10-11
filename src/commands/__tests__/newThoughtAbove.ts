import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import head from '../../util/head'
import newThoughtAboveCommand from '../newThoughtAbove'

beforeEach(initStore)

describe('multicursor', () => {
  it('creates a new empty thought above each selected sibling', () => {
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
      setCursor(['b']),
      addMulticursor(['b']),
      addMulticursor(['c']),
      addMulticursor(['d']),
    ])

    executeCommandWithMulticursor(newThoughtAboveCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    // Each selected thought gets its own new thought directly above it, rather than the selection collapsing to a single insertion.
    // The empty lines below intentionally end in a trailing space, which `${''}` preserves.
    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - ${''}
  - b
  - ${''}
  - c
  - ${''}
  - d
  - e`)
  })

  it('creates a new empty thought above selected thoughts in different parents and at different depths', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - a1
            - a2
          - b
            - b1
        `,
      }),
      setCursor(['a', 'a1']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['a', 'a2']),
      addMulticursor(['b']),
      addMulticursor(['b', 'b1']),
    ])

    executeCommandWithMulticursor(newThoughtAboveCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
    - a1
    - ${''}
    - a2
  - ${''}
  - b
    - ${''}
    - b1`)
  })

  it('places the cursor in the new thought above the last selected thought', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - a1
          - b
            - b1
        `,
      }),
      setCursor(['a', 'a1']),
      addMulticursor(['a', 'a1']),
      addMulticursor(['b', 'b1']),
    ])

    executeCommandWithMulticursor(newThoughtAboveCommand, { store })

    const state = store.getState()

    // The cursor is left in the last thought created rather than restored to a1, where it started.
    expectPathToEqual(state, state.cursor, ['b', ''])
  })

  it('reverts every created thought on a single undo', () => {
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
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newThoughtAboveCommand, { store })

    // Precondition: all three thoughts were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - ${''}
  - a
  - ${''}
  - b
  - ${''}
  - c`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
  })

  // https://github.com/cybersemics/em/issues/3564
  it('selects the new thoughts after execution', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(newThoughtAboveCommand, { store })

    const state = store.getState()
    const newThoughts = getChildrenRanked(state, HOME_TOKEN).filter(child => child.value === '')

    expect(Object.values(state.multicursors).map(head)).toEqual(newThoughts.map(child => child.id))
  })
})
