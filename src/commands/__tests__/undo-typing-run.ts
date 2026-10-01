import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { executeCommand } from '../../commands'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import contextToThought from '../../test-helpers/contextToThought'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'
import thoughtspaceHistory from '../../util/thoughtspaceHistory'
import exportContextCommand from '../exportContext'

beforeEach(initStore)
afterEach(vi.restoreAllMocks)

it('a command that changes nothing does not break a contiguous run of typing into two undo steps', () => {
  store.dispatch([
    importText({
      text: `
      - a
      - unrelated
        - child`,
    }),
    setCursor(['a']),
  ])
  const thought = contextToThought(store.getState(), ['a'])!
  const capture = vi.spyOn(thoughtspaceHistory, 'capture')

  store.dispatch(editThought(['a'], 'ab'))
  expect(capture).toHaveBeenCalled()

  // Export only opens a modal, so it makes no undoable change to the thoughtspace and should not interrupt the run of typing.
  executeCommand(exportContextCommand, { store, type: 'keyboard' })

  store.dispatch(editThought(['ab'], 'abc'))

  // Both the initial edit and the merged typing baseline capture only the edited thought, never the whole document.
  capture.mock.calls.forEach(([, scope]) => expect(scope?.thoughtIds).toEqual(new Set([thought.id])))

  store.dispatch(undo())

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - a
  - unrelated
    - child`)
})
