import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import getChildren from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import resolveNotePath, { hasNotePath } from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'
import deleteNotePathAttribute from './deleteNotePathAttribute'

/**
 * Calculate the offset for note focus positioning.
 */
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

  return reducerFlow([
    // Create note if it doesn't exist or delete if empty
    !targetThought
      ? state => setDescendant(state, { path: state.cursor!, values: ['=note', ''] })
      : // create a target thought if =path attribute has a value
        targetThought && targetThought.value !== '=note' && !offset
        ? state => setDescendant(state, { path: state.cursor!, values: [targetThought?.value, ''] })
        : null,

    // if noteFocus is true, delete the note path attribute if it exists else delete the note attribute
    state.noteFocus && !offset
      ? hasNotePath(state, head(path))
        ? deleteNotePathAttribute({ path })
        : deleteAttribute({ path: state.cursor!, value: '=note' })
      : null,

    // Toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    state => (state.noteFocus ? setNoteFocus(state, { value: false }) : setNoteFocus(state, { value: true, offset })),
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
