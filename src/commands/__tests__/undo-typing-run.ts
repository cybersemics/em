import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import exportContextCommand from '../exportContext'

beforeEach(initStore)

it('a command that changes nothing does not break a contiguous run of typing into two undo steps', () => {
  store.dispatch([
    importText({
      text: `
      - a`,
    }),
    setCursor(['a']),
    editThought(['a'], 'ab'),
  ])

  // Export only opens a modal, so it makes no undoable change to the thoughtspace and should not interrupt the run of typing.
  executeCommand(exportContextCommand, { store, type: 'keyboard' })

  store.dispatch([editThought(['ab'], 'abc'), undo()])

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a`)
})
