import State from '../@types/State'
import Thunk from '../@types/Thunk'
import createThought from '../actions/createThought'
import deleteAttribute from '../actions/deleteAttribute'
import setDescendant from '../actions/setDescendant'
import setNoteFocus from '../actions/setNoteFocus'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import getChildren from '../selectors/getChildren'
import getNextRank from '../selectors/getNextRank'
import getPathReferenceValue, {
  getPathReferenceTargetId,
  hasValidPathReference,
} from '../selectors/resolvePathReference'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State): State => {
  const thoughtId = head(state.cursor!)
  const hasNote = findDescendant(state, thoughtId, '=note')

  // Check if there's a path reference (=note/=path)
  const hasPathReference = hasValidPathReference(state, state.cursor!)

  return reducerFlow([
    // Handle path reference: create target thought if needed
    hasPathReference
      ? state => {
          const pathValue = getPathReferenceValue(state, state.cursor!)
          const targetId = getPathReferenceTargetId(state, state.cursor!)

          // If target doesn't exist but we have a path value, create the target thought
          if (!targetId && pathValue) {
            const pathRank = getNextRank(state, thoughtId)
            return createThought(state, {
              path: [thoughtId],
              value: pathValue,
              rank: pathRank,
            })
          }
          return state
        }
      : null,

    // Create an empty child for target if needed
    hasPathReference
      ? state => {
          const targetId = getPathReferenceTargetId(state, state.cursor!)
          if (!targetId) return state

          // Check if target has children
          const targetChildren = getChildren(state, targetId)
          if (targetChildren.length === 0) {
            // Create empty child for target
            const childRank = getNextRank(state, targetId)
            return createThought(state, {
              path: [targetId],
              value: '',
              rank: childRank,
            })
          }
          return state
        }
      : null,

    // Create an empty note if it doesn't exist
    !hasNote
      ? state =>
          setDescendant(state, {
            path: state.cursor!,
            values: ['=note', ''],
          })
      : // Only delete the note if it's empty (no value and no path reference)
        state.noteFocus && !attribute(state, thoughtId, '=note') && !hasPathReference
        ? state => deleteAttribute(state, { path: state.cursor!, value: '=note' })
        : null,

    // Toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    state => {
      if (state.noteFocus) {
        return setNoteFocus(state, { value: false })
      } else {
        let offset = 0

        if (hasPathReference) {
          const targetId = getPathReferenceTargetId(state, state.cursor!)
          if (targetId) {
            const targetChildren = getChildren(state, targetId)
            offset = targetChildren.length > 0 ? targetChildren[0].value.length : 0
          }
        } else if (hasNote) {
          const noteChildren = getChildren(state, hasNote)
          offset = noteChildren.length ? noteChildren[0].value.length : 0
        }

        return setNoteFocus(state, { value: true, offset })
      }
    },
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
