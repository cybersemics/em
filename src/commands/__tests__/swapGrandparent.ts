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
import pathToContext from '../../util/pathToContext'
import swapGrandparentCommand from '../swapGrandparent'

beforeEach(initStore)

describe('multicursor', () => {
  it('swaps each selected thought with its own grandparent', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
              - c1
          - a2
            - b2
              - c2
        `,
      }),
      setCursor(['a1', 'b1', 'c1']),
      addMulticursor(['a1', 'b1', 'c1']),
      addMulticursor(['a2', 'b2', 'c2']),
    ])

    executeCommandWithMulticursor(swapGrandparentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - c1
    - b1
      - a1
  - c2
    - b2
      - a2`)
  })

  it('does not swap a selected thought that has no grandparent', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
          - a2
            - b2
              - c2
        `,
      }),
      setCursor(['a1', 'b1']),
      addMulticursor(['a1', 'b1']),
      addMulticursor(['a2', 'b2', 'c2']),
    ])

    executeCommandWithMulticursor(swapGrandparentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a1
    - b1
  - c2
    - b2
      - a2`)
  })

  it('restores the cursor and multicursors to the swapped thoughts', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
              - c1
          - a2
            - b2
              - c2
        `,
      }),
      setCursor(['a1', 'b1', 'c1']),
      addMulticursor(['a1', 'b1', 'c1']),
      addMulticursor(['a2', 'b2', 'c2']),
    ])

    executeCommandWithMulticursor(swapGrandparentCommand, { store })

    const state = store.getState()

    // c1 and c2 moved to the root, so the restored cursor and multicursors must follow them there.
    expectPathToEqual(state, state.cursor, ['c1'])
    expect(Object.values(state.multicursors).map(path => pathToContext(state, path))).toEqual([['c1'], ['c2']])
  })

  it('reverts every swap on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
              - c1
          - a2
            - b2
              - c2
        `,
      }),
      setCursor(['a1', 'b1', 'c1']),
      addMulticursor(['a1', 'b1', 'c1']),
      addMulticursor(['a2', 'b2', 'c2']),
    ])

    executeCommandWithMulticursor(swapGrandparentCommand, { store })

    // Precondition: both swaps occurred, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - c1
    - b1
      - a1
  - c2
    - b2
      - a2`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a1
    - b1
      - c1
  - a2
    - b2
      - c2`)
  })
})
