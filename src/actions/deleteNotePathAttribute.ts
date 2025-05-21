import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import resolveNotePath from '../selectors/resolveNotePath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import deleteThought from './deleteThought'

/** Deletes the referenced thought if it exists when =note/=path structure exists. */
const deleteNotePathAttribute = (state: State, { path }: { path: Path | null }): State => {
  if (!path) return state

  const targetPath = resolveNotePath(state, path)
  if (!targetPath) return state

  const targetThoughtId = head(targetPath)

  return deleteThought(state, {
    pathParent: path,
    thoughtId: targetThoughtId,
  })
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
