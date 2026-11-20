import { importTextActionCreator as importText } from '../../actions/importText'
import { chainCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import indentCommand from '../indent'
import mergeDuplicatesCommand from '../mergeDuplicates'
import outdentCommand from '../outdent'
import selectAllCommand from '../selectAll'

beforeEach(initStore)

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

describe('excluded commands', () => {
  // https://github.com/cybersemics/em/issues/5874
  it.skip('does not chain Merge Duplicates, which merges the same level as Merge Duplicates alone', () => {
    expect(selectAllCommand.isChainable(mergeDuplicatesCommand)).toBe(false)
  })
})
