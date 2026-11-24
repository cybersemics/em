import { GestureResponderEvent } from 'react-native'
import { importTextActionCreator as importText } from '../../actions/importText'
import { chainCommand, handleGestureEnd } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import indentCommand from '../indent'
import mergeDuplicatesCommand from '../mergeDuplicates'
import outdentCommand from '../outdent'
import selectAllCommand from '../selectAll'
import toggleTableViewCommand from '../toggleTableView'

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

  // https://github.com/cybersemics/em/issues/5874
  it('disables Table View, which would toggle the same parent as Table View alone', () => {
    store.dispatch([
      importText({
        text: `
          - p
            - a
            - b
        `,
      }),
      setCursor(['p', 'b']),
    ])

    const selectAllTableView = chainCommand(selectAllCommand, toggleTableViewCommand)
    expect(selectAllTableView.canExecute!(store.getState())).toBe(false)
  })

  it('does not run Table View from the Select All + Table View gesture', () => {
    store.dispatch([
      importText({
        text: `
          - p
            - a
              - a1
            - b
              - b1
        `,
      }),
      setCursor(['p', 'b']),
    ])

    // Select All (ldr) + Table View (rdlu)
    handleGestureEnd({ sequence: 'ldr' + 'dlu', e: {} as GestureResponderEvent })

    const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
    expect(exported).toBe(`- ${HOME_TOKEN}
  - p
    - a
      - a1
    - b
      - b1`)
  })

  // https://github.com/cybersemics/em/issues/5874
  it('disables Merge Duplicates, which would merge the same level as Merge Duplicates alone', () => {
    store.dispatch([
      importText({
        text: `
          - p
            - a
            - a
            - b
        `,
      }),
      setCursor(['p', 'b']),
    ])

    const selectAllMergeDuplicates = chainCommand(selectAllCommand, mergeDuplicatesCommand)
    expect(selectAllMergeDuplicates.canExecute!(store.getState())).toBe(false)
  })
})
