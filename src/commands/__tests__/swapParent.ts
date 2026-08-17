import { importTextActionCreator as importText } from '../../actions/importText'
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

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4951406524
  it('cannot swap parent when multiple thoughts are selected', () => {
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
  it('swaps the selected thought with its parent and restores the selection', () => {
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
    ])

    executeCommandWithMulticursor(swapParentCommand, { store })

    const state = store.getState()

    expect(exportContext(state, [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - b1
    - a1
  - a2
    - b2`)

    // b1 moved to the root, so the restored cursor and multicursor must follow it there. Restoring the
    // multicursor is what keeps the Command Center open after the swap.
    expectPathToEqual(state, state.cursor, ['b1'])
    expect(
      Object.values(state.multicursors).map(path => childIdsToThoughts(state, path).map(thought => thought.value)),
    ).toEqual([['b1']])
  })

  // https://github.com/cybersemics/em/pull/4867#pullrequestreview-4951406524
  it('does not swap when a thought and its parent are both selected', () => {
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
