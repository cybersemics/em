import { importTextActionCreator as importText } from '../../actions/importText'
import { chainCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import indentCommand from '../indent'
import newUncleCommand from '../newUncle'
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

  // https://github.com/cybersemics/em/issues/5874
  it.skip('disables New Subthought (next) on an only child, where it gives the same result as New Subthought (next) alone', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - p
              - a
        `,
      }),
      setCursor(['x', 'p', 'a']),
    ])

    const selectAllNewUncle = chainCommand(selectAllCommand, newUncleCommand)
    expect(selectAllNewUncle.canExecute!(store.getState())).toBe(false)
  })

  it('enables New Subthought (next) when there are several siblings', () => {
    store.dispatch([
      importText({
        text: `
          - x
            - p
              - a
              - b
        `,
      }),
      setCursor(['x', 'p', 'b']),
    ])

    const selectAllNewUncle = chainCommand(selectAllCommand, newUncleCommand)
    expect(selectAllNewUncle.canExecute!(store.getState())).toBe(true)
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
