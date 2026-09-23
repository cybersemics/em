import { importTextActionCreator as importText } from '../../actions/importText'
import { setNoteFocusActionCreator as setNoteFocus } from '../../actions/setNoteFocus'
import { executeCommand, resetLastCommand } from '../../commands'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorDownCommand from '../cursorDown'
import repeatCommand from '../repeat'

// Disable animation frame throttling so each command executes synchronously and deterministically across tests.
vi.mock('../../util/throttleByAnimationFrame', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (f: (...args: any[]) => void) => f,
}))

beforeEach(async () => {
  await initStore()
  // lastCommand is module-level state in commands.ts that is not reset by initStore
  resetLastCommand()
})

it('ignore a navigation command that is the first change in the undo history', () => {
  // Blurring a note while there is no cursor is undoable and navigational, but every property it touches is already at
  // its default, so it is the last action seen by the undo history without adding a patch of its own. The cursor
  // movements that follow are then the first patch in the history, with no earlier patch to be adjoined to.
  store.dispatch(setNoteFocus({ value: false }))

  store.dispatch([
    importText({
      text: `
        - a
        - b
        - c
    `,
    }),
    setCursor(['a']),
  ])

  executeCommand(cursorDownCommand, { store })
  expect(headValue(store.getState(), store.getState().cursor!)).toEqual('b')

  executeCommand(repeatCommand, { store })

  // Cursor Down is navigational, so it is never the Repeat target and the cursor does not move again.
  expect(headValue(store.getState(), store.getState().cursor!)).toEqual('b')
})
