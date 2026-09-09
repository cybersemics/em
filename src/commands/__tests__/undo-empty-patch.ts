import { importTextActionCreator as importText } from '../../actions/importText'
import { redoActionCreator as redo } from '../../actions/redo'
import { setNoteFocusActionCreator as setNoteFocus } from '../../actions/setNoteFocus'
import { toggleNoteActionCreator as toggleNote } from '../../actions/toggleNote'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import isRedoEnabled from '../../selectors/isRedoEnabled'
import store from '../../stores/app'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import initStore from '../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

beforeEach(initStore)

it('redo is disabled after redoing an undo whose patch reverted nothing', () => {
  store.dispatch([
    importText({
      text: `
        - a
          - =note
            - hello
        - b`,
    }),
    setCursor(['a']),
    editThought(['a'], 'aa'),
    // Open, close, and open the note again with the Note command. It is not undoable, so it records no patch, and it leaves
    // cursorOffset at the end of the thought.
    toggleNote(),
    toggleNote(),
    toggleNote(),
    // Note.tsx dispatches setNoteFocus when the note is blurred. It is undoable, so it records a patch, and noteFocus and
    // noteOffset are the only two properties it restores.
    setNoteFocus({ value: false }),
    // The Note command opens the note again, setting noteFocus and noteOffset back to exactly what that patch restores and
    // leaving it with nothing left to revert.
    toggleNote(),
  ])

  // Undoing the patch that reverts nothing recomputes a patch with no operations. It reverses nothing, so it must not be
  // recorded as a redo step.
  store.dispatch(undo())
  store.dispatch(redo())

  // Everything that was undone has been redone.
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toEqual(`- ${HOME_TOKEN}
  - aa
    - =note
      - hello
  - b`)

  // Redo must no longer be offered. A retained empty patch keeps Redo enabled forever, and pressing it changes nothing.
  expect(isRedoEnabled(store.getState())).toBe(false)
})
