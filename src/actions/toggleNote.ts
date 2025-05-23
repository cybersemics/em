import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import getChildren from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import parentOfThought from '../selectors/parentOfThought'
import resolveNotePath from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Calculate the offset for note focus positioning.*/
const calculateOffset = (state: State, thoughtId: ThoughtId | undefined): number => {
  if (!thoughtId) return 0
  const noteChildren = getChildren(state, thoughtId)
  return noteChildren.length ? noteChildren[0].value.length : 0
}

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State): State => {
  const path = state.cursor!
  const targetThoughtPath = resolveNotePath(state, path)
  const targetThought = targetThoughtPath ? getThoughtById(state, head(targetThoughtPath)) : undefined
  const offset = calculateOffset(state, targetThought?.id)
  const isNoteContentEmpty = !offset
  const noteThoughtParent =
    targetThought && targetThought.value === '=note' ? parentOfThought(state, targetThought.id) : undefined

  return reducerFlow([
    // if noteFocus is true, delete the target thought if the note is empty, otherwise set the note to the target thought or create a missing target thought
    state.noteFocus
      ? isNoteContentEmpty && targetThought
        ? noteThoughtParent?.value !== '=children'
          ? deleteThought({
              pathParent: path,
              thoughtId: targetThought.id,
            })
          : null
        : null
      : isNoteContentEmpty && noteThoughtParent?.value !== '=children'
        ? setDescendant({ path: state.cursor!, values: [targetThought?.value || '=note', ''] })
        : null,

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
