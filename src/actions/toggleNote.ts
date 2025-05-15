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
import { registerActionMetadata } from '../util/actionMetadata.registry'
import createId from '../util/createId'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import resolvePathReference from '../util/resolvePathReference'

/** Toggle the caret between the cursor and its note. Set the selection to the end. If the note is empty, delete it. */
const toggleNote = (state: State): State => {
  const thoughtId = head(state.cursor!)
  const hasNote = findDescendant(state, thoughtId, '=note')

  // Check if there's a path reference
  const pathReference = resolvePathReference(state, thoughtId, hasNote || undefined)

  // Calculate offset and handle target thought creation if needed
  let offset = 0
  let newState = state

  if (pathReference) {
    // Start with the targetId from pathReference (could be undefined if target doesn't exist)
    let targetId = pathReference.targetId

    // Create the missing target thought if it doesn't exist
    if (!pathReference.targetExists) {
      // Calculate appropriate rank for the new thought
      const pathRank = getNextRank(state, thoughtId)

      // Create the target thought
      newState = createThought(state, {
        id: createId(),
        path: [thoughtId],
        value: pathReference.pathValue,
        rank: pathRank,
      })

      // Find the newly created thought - this will not be null after creation
      const newTargetId = findDescendant(newState, thoughtId, pathReference.pathValue)
      if (newTargetId) {
        targetId = newTargetId
      }
    }

    if (targetId) {
      // Check if the target thought has children
      const targetChildren = getChildren(newState, targetId)

      // If the target has no children, create an empty child
      if (targetChildren.length === 0) {
        // Calculate appropriate rank for the child thought
        const childRank = getNextRank(newState, targetId)

        // Create an empty child for the target path
        newState = createThought(newState, {
          path: [targetId],
          value: '',
          rank: childRank,
        })

        // Get the updated children to calculate offset
        const updatedChildren = getChildren(newState, targetId)
        if (updatedChildren.length) {
          offset = updatedChildren[0].value.length
        }
      } else {
        // If target already has children, set offset to the length of the first child's value
        offset = targetChildren[0].value.length
      }
    }
  } else if (hasNote) {
    // Get the note content
    const noteContent = attribute(newState, hasNote, '')
    offset = noteContent?.length || 0
  }

  // Apply note changes on top of the newState
  const finalState = reducerFlow([
    // Create an empty note if it doesn't exist
    !hasNote
      ? state =>
          setDescendant(state, {
            path: state.cursor!,
            values: ['=note', ''],
          })
      : // Only delete the note if it's empty (no value and no path reference)
        state.noteFocus && !attribute(state, thoughtId, '=note') && !pathReference
        ? state => deleteAttribute(state, { path: state.cursor!, value: '=note' })
        : null,

    // Toggle state.noteFocus, which will trigger the Editable and Note to re-render and set the selection appropriately
    state.noteFocus
      ? state => setNoteFocus(state, { value: false })
      : state => setNoteFocus(state, { value: true, offset }),
  ])(newState)

  return finalState
}

/** Action-creator for toggleNote. */
export const toggleNoteActionCreator = (): Thunk => dispatch => dispatch({ type: 'toggleNote' })

export default toggleNote

// Register this action's metadata
registerActionMetadata('toggleNote', {
  undoable: true,
  isNavigation: true,
})
