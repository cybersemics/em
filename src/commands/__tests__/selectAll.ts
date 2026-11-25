import { importTextActionCreator as importText } from '../../actions/importText'
import { chainCommand, executeCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import multicursorValues from '../../test-helpers/multicursorValues'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import { toggleMulticursorAtFirstMatchActionCreator as toggleMulticursor } from '../../test-helpers/toggleMulticursorAtFirstMatch'
import indentCommand from '../indent'
import outdentCommand from '../outdent'
import selectAllCommand from '../selectAll'
import swapParentCommand from '../swapParent'

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/3561
it('selects all thoughts at the cursor depth and clears the deeper selection', () => {
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
    toggleMulticursor(['a', 'b']),
    toggleMulticursor(['a', 'c']),
  ])

  executeCommand(selectAllCommand, { store })

  expect(multicursorValues()).toEqual(['a', 'd'])
})

describe('chained commands', () => {
  // https://github.com/cybersemics/em/issues/5874
  it('disables Indent, since every sibling is selected and none has an unselected previous sibling', () => {
    store.dispatch([
      importText({
        text: `
          - a
          - b
          - c
        `,
      }),
      setCursor(['b']),
    ])

    const selectAllIndent = chainCommand(selectAllCommand, indentCommand)
    expect(selectAllIndent.canExecute!(store.getState())).toBe(false)
  })

  // https://github.com/cybersemics/em/issues/5874
  it('disables Swap Parent when there are several siblings', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - a
            - b
        `,
      }),
      setCursor(['x', 'b']),
    ])

    const selectAllSwapParent = chainCommand(selectAllCommand, swapParentCommand)
    expect(selectAllSwapParent.canExecute!(store.getState())).toBe(false)
  })

  it('enables Outdent on a nested level', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - a
            - b
        `,
      }),
      setCursor(['x', 'b']),
    ])

    const selectAllOutdent = chainCommand(selectAllCommand, outdentCommand)
    expect(selectAllOutdent.canExecute!(store.getState())).toBe(true)
  })
})
