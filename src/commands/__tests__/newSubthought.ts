import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pathToContext from '../../util/pathToContext'
import newSubthoughtCommand from '../newSubthought'

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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - ${''}
  - b
    - ${''}
  - c
    - ${''}`)
  })

  it('inserts the new subthought below existing children', () => {
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - a1
    - a2
    - ${''}
  - b
    - b1
    - ${''}`)
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - b
      - ${''}
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    const state = store.getState()
    expectPathToEqual(state, state.cursor, ['b', ''])
  })

  it('selects the new subthoughts so that each of them is expanded into view', () => {
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    const state = store.getState()

    expect(Object.values(state.multicursors).map(path => pathToContext(state, path))).toEqual([
      ['a', ''],
      ['b', ''],
    ])

    // A thought is only expanded when it is the cursor or a multicursor parent, so the selection above is what makes both new subthoughts visible.
    expect(Object.values(state.expanded).map(path => pathToContext(state, path))).toIncludeAllMembers([['a'], ['b']])
  })

  it('clears the multicursor when a single thought is selected, so that the new subthought can be typed into', () => {
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

    expect(hasMulticursor(store.getState())).toBeFalse()
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

    executeCommandWithMulticursor(newSubthoughtCommand, { store })

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
