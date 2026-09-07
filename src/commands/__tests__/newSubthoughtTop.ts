import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import contextToPath from '../../selectors/contextToPath'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import hashPath from '../../util/hashPath'
import newSubthoughtTopCommand from '../newSubthoughtTop'

beforeEach(initStore)

describe('multicursor', () => {
  it('creates a new empty subthought in each selected thought', () => {
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

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
  - b
    - ${''}
  - c
    - ${''}`)
  })

  it('inserts the new subthought above existing children', () => {
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
      setCursor(['a']),
      addMulticursor(['a']),
      addMulticursor(['b']),
    ])

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
    - a1
    - a2
  - b
    - ${''}
    - b1`)
  })

  it('creates a subthought in each of a selected parent and its selected child', () => {
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
      addMulticursor(['c']),
    ])

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
    - b
      - ${''}
  - c
    - ${''}`)
  })

  it('places the cursor in the new subthought of the last selected thought', () => {
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

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['b', ''])
  })

  it('selects the new subthoughts after execution', () => {
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

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const state = store.getState()
    const multicursors = Object.values(state.multicursors)

    expect(multicursors).toHaveLength(2)
    expectPathToEqual(state, multicursors[0], ['a', ''])
    expectPathToEqual(state, multicursors[1], ['b', ''])
  })

  it('expands each selected thought so that its new subthought is visible', () => {
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

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    const state = store.getState()

    expect(state.expanded[hashPath(contextToPath(state, ['a'])!)]).toBeTruthy()
    expect(state.expanded[hashPath(contextToPath(state, ['b'])!)]).toBeTruthy()
  })

  it('reverts every created subthought on a single undo', () => {
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

    executeCommandWithMulticursor(newSubthoughtTopCommand, { store })

    // Precondition: all three subthoughts were created, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
  - b
    - ${''}
  - c
    - ${''}`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
  - b
  - c`)
  })
})
