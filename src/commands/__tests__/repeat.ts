import { importTextActionCreator as importText } from '../../actions/importText'
import { executeCommandWithMulticursor, resetLastCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import headValue from '../../util/headValue'
import cursorDownCommand from '../cursorDown'
import exportContextCommand from '../exportContext'
import moveThoughtDownCommand from '../moveThoughtDown'
import pinCommand from '../pin'
import repeatCommand from '../repeat'
import undoCommand from '../undo'

// Disable animation frame throttling so each command executes synchronously and deterministically across tests.
vi.mock('../../util/throttleByAnimationFrame', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (f: (...args: any[]) => void) => f,
}))

beforeEach(() => {
  initStore()
  // lastCommand is module-level state in commands.ts that is not reset by initStore
  resetLastCommand()
})

it('execute the last command again', () => {
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

  executeCommandWithMulticursor(moveThoughtDownCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - b
  - c
  - a`)
})

it('repeat does not repeat itself', () => {
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
  ])

  executeCommandWithMulticursor(moveThoughtDownCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - b
  - c
  - d
  - a`)
})

it('do nothing when no command has been executed', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(repeatCommand, { store })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
  - b`)
})

it('ignore navigation commands', () => {
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

  executeCommandWithMulticursor(pinCommand, { store })
  executeCommandWithMulticursor(cursorDownCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  // pin is repeated on the cursor thought, and the cursor is not moved again
  expect(headValue(store.getState(), store.getState().cursor!)).toEqual('b')

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =pin
  - b
    - =pin
  - c`)
})

it('ignore commands that do not dispatch an undoable action', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(pinCommand, { store })
  executeCommandWithMulticursor(exportContextCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  // pin is repeated, toggling it back off
  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
  - b`)
})

it('ignore undo', () => {
  store.dispatch([
    importText({
      text: `
        - a
        - b
    `,
    }),
    setCursor(['a']),
  ])

  executeCommandWithMulticursor(pinCommand, { store })
  executeCommandWithMulticursor(undoCommand, { store })
  executeCommandWithMulticursor(repeatCommand, { store })

  // pin is repeated rather than undone a second time
  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - a
    - =pin
  - b`)
})
