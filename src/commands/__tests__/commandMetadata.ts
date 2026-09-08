import { importTextActionCreator as importText } from '../../actions/importText'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../../actions/moveThoughtDown'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import stepsToReproduce from '../../selectors/stepsToReproduce'
import store from '../../stores/app'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import moveThoughtDownCommand from '../moveThoughtDown'
import repeatCommand from '../repeat'

beforeEach(initStore)

it('attributes an asynchronous command through nested thunks without an opt-in wrapper', async () => {
  store.dispatch([importText({ text: '- a\n- b' }), setCursor(['a'])])

  // The command executor is the subject: this command exercises its asynchronous dispatch contract.
  await executeCommand(
    {
      ...moveThoughtDownCommand,
      exec: async dispatch => {
        await Promise.resolve()
        await dispatch(async dispatch => {
          await Promise.resolve()
          dispatch([moveThoughtDown()])
        })
      },
    },
    { type: 'toolbar' },
  )

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
  - a`)
  expect(stepsToReproduce(store.getState(), { start: 1, end: 0 })).toContain('Tap the Move Thought Down button.')
})

it('does not replace Repeat with a no-op invocation of the same command', () => {
  store.dispatch([importText({ text: '- a\n- b\n- c' }), setCursor(['a'])])
  executeCommand(moveThoughtDownCommand)

  executeCommand({ ...moveThoughtDownCommand, exec: () => {} })
  executeCommand(repeatCommand)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - b
  - c
  - a`)
})
