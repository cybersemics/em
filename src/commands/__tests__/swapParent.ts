import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommandWithMulticursor } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import childIdsToThoughts from '../../selectors/childIdsToThoughts'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursor } from '../../test-helpers/addMulticursorAtFirstMatch'
import expectPathToEqual from '../../test-helpers/expectPathToEqual'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import swapParentCommand from '../swapParent'

beforeEach(initStore)

describe('multicursor', () => {
  it('swaps each selected thought with its own parent', () => {
    store.dispatch([
      importText({
        text: `
          - =children
            - =pin
              - true
          - a1
            - b1
          - a2
            - b2
          - a3
            - b3
        `,
      }),
      setCursor(['a1', 'b1']),
      addMulticursor(['a1', 'b1']),
      addMulticursor(['a2', 'b2']),
      addMulticursor(['a3', 'b3']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - =children
    - =pin
      - true
  - b1
    - a1
  - b2
    - a2
  - b3
    - a3`)
  })

  it('swaps thoughts at different levels', () => {
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

    executeCommandWithMulticursor(swapParentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - b1
    - a1
  - a2
    - c2
      - b2`)
  })

  it('swaps selected siblings with their parent in turn', () => {
    store.dispatch([
      importText({
        text: `
          - a
            - b
            - c
        `,
      }),
      setCursor(['a', 'b']),
      addMulticursor(['a', 'b']),
      addMulticursor(['a', 'c']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    // b is swapped with a first, moving its sibling c under b. c is then swapped with its new parent b,
    // moving b and its sibling a under c.
    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - c
    - a
    - b`)
  })

  it('does not swap a selected thought that is already at the root', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
          - a2
            - b2
        `,
      }),
      setCursor(['a1']),
      addMulticursor(['a1']),
      addMulticursor(['a2', 'b2']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a1
    - b1
  - b2
    - a2`)
  })

  it('restores the cursor and multicursors to the swapped thoughts', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
          - a2
            - b2
        `,
      }),
      setCursor(['a1', 'b1']),
      addMulticursor(['a1', 'b1']),
      addMulticursor(['a2', 'b2']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    const state = store.getState()

    // b1 and b2 moved to the root, so the restored cursor and multicursors must follow them there.
    expectPathToEqual(state, state.cursor, ['b1'])
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([['b1'], ['b2']])
  })

  it('reverts every swap on a single undo', () => {
    store.dispatch([
      importText({
        text: `
          - a1
            - b1
          - a2
            - b2
          - a3
            - b3
        `,
      }),
      setCursor(['a1', 'b1']),
      addMulticursor(['a1', 'b1']),
      addMulticursor(['a2', 'b2']),
      addMulticursor(['a3', 'b3']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    // Precondition: all three swaps occurred, otherwise the undo below would have nothing to revert.
    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - b1
    - a1
  - b2
    - a2
  - b3
    - a3`)

    store.dispatch(undo())

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
  - a1
    - b1
  - a2
    - b2
  - a3
    - b3`)
  })
})
