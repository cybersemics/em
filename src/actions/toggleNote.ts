import State from '../@types/State'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import { anyChild } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import resolveNotePath from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State): State => {
  const path = state.cursor!
  const targetPath = resolveNotePath(state, path)
  const targetThought = targetPath ? getThoughtById(state, head(targetPath)) : undefined
  const offset = anyChild(state, targetThought?.id)?.value.length ?? 0

  return reducerFlow([
    // if offset is 0 i.e. note is empty, and noteFocus is true, delete the target thought, otherwise set the note to the target thought or create a missing target thought
    offset
      ? null
      : state.noteFocus && targetThought
        ? deleteThought({
            pathParent: path,
            thoughtId: targetThought.id,
          })
        : setDescendant({ path: state.cursor!, values: [targetThought?.value || '=note', ''] }),

    // Toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    setNoteFocus(state.noteFocus ? { value: false } : { value: true, offset }),
  ])(state)
}

/** Action-creator for toggleNote. */
export const toggleNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleNote' })

export default toggleNote

// Register this action's metadata
registerActionMetadata('toggleNote', {
  undoable: true,
  isNavigation: true,
})
