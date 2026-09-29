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

describe('canExecute', () => {
  // https://github.com/cybersemics/em/issues/4866
  it('cannot swap parent of a top-level thought when the Command Center selects the cursor', () => {
    store.dispatch([
      importText({
        text: `
          - a
        `,
      }),
      setCursor(['a']),
      addMulticursor(['a']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(false)
  })

  // https://github.com/cybersemics/em/issues/4866
  it('can swap parent of a selected subthought when the cursor is on a parent-level thought', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
          - BBB
            - CCC
        `,
      }),
      setCursor(['AAA']),
      addMulticursor(['BBB', 'CCC']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(true)
  })

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4973103498
  it('can swap parent when every selected thought is a subthought', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
            - BBB
          - CCC
            - DDD
        `,
      }),
      setCursor(['AAA', 'BBB']),
      addMulticursor(['AAA', 'BBB']),
      addMulticursor(['CCC', 'DDD']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(true)
  })

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4951406524
  it('cannot swap parent when a selected thought is at the root', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
            - BBB
          - CCC
          - DDD
        `,
      }),
      setCursor(['AAA', 'BBB']),
      addMulticursor(['AAA', 'BBB']),
      addMulticursor(['CCC']),
    ])

    expect(swapParentCommand.canExecute!(store.getState())).toBe(false)
  })
})

describe('multicursor', () => {
  it('swaps each selected thought with its own parent', () => {
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

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

    expect(exported).toEqual(`- ${HOME_TOKEN}
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
    // Restoring the multicursors is what keeps the Command Center open after the swap.
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

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4951406524
  it('does not swap when a thought and its top-level parent are both selected', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
            - BBB
          - CCC
          - DDD
        `,
      }),
      setCursor(['AAA', 'BBB']),
      addMulticursor(['AAA', 'BBB']),
      addMulticursor(['AAA']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - AAA
    - BBB
  - CCC
  - DDD`)
  })

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4951406524
  it('does not swap when thoughts in different contexts are selected', () => {
    store.dispatch([
      importText({
        text: `
          - AAA
            - BBB
          - CCC
          - DDD
        `,
      }),
      setCursor(['AAA', 'BBB']),
      addMulticursor(['AAA', 'BBB']),
      addMulticursor(['CCC']),
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - AAA
    - BBB
  - CCC
  - DDD`)
  })
})
