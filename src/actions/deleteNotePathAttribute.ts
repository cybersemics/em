import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import findDescendant from '../selectors/findDescendant'
import { getPathReferenceTargetId } from '../selectors/resolvePathReference'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import deleteThought from './deleteThought'

/** Deletes the =note attribute and it's descendants and the referenced thought if it exists. */
const deleteNotePathAttribute = (state: State, { path }: { path: Path | null }): State => {
  if (!path) return state
  const thoughtId = head(path)
  const noteId = findDescendant(state, thoughtId, '=note')

  if (!noteId) return state

  const targetId = getPathReferenceTargetId(state, path, noteId)
  if (!targetId) return state

  return reducerFlow([
    // Delete the target thought itself (the referenced path)
    state =>
      deleteThought(state, {
        pathParent: [thoughtId],
        thoughtId: targetId,
      }),

    // Delete the entire =note structure
    state => {
      const updatedNoteId = findDescendant(state, thoughtId, '=note')
      if (!updatedNoteId) return state

      return deleteThought(state, {
        pathParent: path,
        thoughtId: updatedNoteId,
      })
    },
  ])(state)
}

/** Action-creator for deleteAttribute. */
export const deleteNotePathAttributeActionCreator =
  (payload: Parameters<typeof deleteNotePathAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteNotePathAttribute', ...payload })

export default _.curryRight(deleteNotePathAttribute)

// Register this action's metadata
registerActionMetadata('deleteNotePathAttribute', {
  undoable: true,
})
