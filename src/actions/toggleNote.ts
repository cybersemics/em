import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import getChildren from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import resolveNotePath from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteAttribute from './deleteAttribute'
import deleteThought from './deleteThought'

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
  const isNoteContentEmpty = !offset
  const isNoteAttribute = targetThought && targetThought.value === '=note'

  return reducerFlow([
    // Create note if target thought doesn't exist (=note attribute)
    !targetThought
      ? state => setDescendant(state, { path: state.cursor!, values: ['=note', ''] })
      : !isNoteAttribute && isNoteContentEmpty
        ? state.noteFocus
          ? // delete the target thought if it exists via =path
            state =>
              deleteThought(state, {
                pathParent: path,
                thoughtId: targetThought.id,
              })
          : // create a missing target thought if it doesn't exist via =path
            state => setDescendant(state, { path: state.cursor!, values: [targetThought?.value, ''] })
        : null,

    // if targetThought is a noteAttribute and the note content is empty and noteFocus is true, delete the note attribute
    state.noteFocus && isNoteAttribute && isNoteContentEmpty
      ? deleteAttribute({ path: state.cursor!, value: '=note' })
      : null,

    // Toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    state.noteFocus ? setNoteFocus({ value: false }) : setNoteFocus({ value: true, offset }),
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
