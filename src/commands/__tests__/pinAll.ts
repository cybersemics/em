import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import pinAllCommand from '../pinAll'

beforeEach(initStore)

/** Exports the current thoughtspace as plaintext. */
const exported = () => exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

it('pin all subthoughts at the current level', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
          - d
            - e
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinAllCommand, { store })

  expect(exported()).toEqual(`- ${HOME_TOKEN}
  - a
    - =children
      - =pin
        - true
    - b
      - c
    - d
      - e`)
})

it('isActive reflects whether the current level is pinned', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - c
    `,
    }),
    setCursor(['a', 'b']),
  ])

  expect(pinAllCommand.isActive!(store.getState())).toBe(false)

  executeCommand(pinAllCommand, { store })

  expect(pinAllCommand.isActive!(store.getState())).toBe(true)
})

// Pin All strips =pin/false from each subthought before setting =children/=pin, so it used to dispatch several
// actions and thus create one undo patch each. A single undo left the thoughts in a state the user never
// created: unpinned, but with their =pin/false settings still missing.
it('undo restores =pin/false subthoughts in a single step', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - false
            - c
          - d
            - =pin
              - false
            - e
    `,
    }),
    setCursor(['a', 'b']),
  ])

  const before = exported()
  const undoPatchesBefore = store.getState().undoPatches.length

  executeCommand(pinAllCommand, { store })

  expect(store.getState().undoPatches.length - undoPatchesBefore).toBe(1)

  store.dispatch({ type: 'undo' })

  expect(exported()).toEqual(before)
})

it('redo reapplies the pin in a single step', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - b
            - =pin
              - false
            - c
    `,
    }),
    setCursor(['a', 'b']),
  ])

  executeCommand(pinAllCommand, { store })
  const afterPin = exported()

  store.dispatch({ type: 'undo' })
  store.dispatch({ type: 'redo' })

  expect(exported()).toEqual(afterPin)
})
