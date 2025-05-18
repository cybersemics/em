import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import reducerFlow from '../util/reducerFlow'
import { getPathReferencePath } from './../selectors/resolvePathReference'
import archiveThought from './archiveThought'

/** Archives a thought that is referenced by a =path. */
const archivePathReferenceThought = (state: State, options: { path?: Path; pathNote?: Path }): State => {
  const path = options.path || state.cursor
  const pathNote = options.pathNote
  if (!path || !pathNote) return state

  const targetPath = getPathReferencePath(state, path)

  // If we found a valid target path, archive it first, then proceed with archiving the note
  if (targetPath) {
    return reducerFlow([
      // Archive the target thought first
      state => archiveThought(state, { path: targetPath }),

      // Then continue with normal archive of the note
      state => archiveThought(state, { path: pathNote }),
    ])(state)
  }
  return state
}

/** Action-creator for archiveThought. */
export function archivePathReferenceThoughtActionCreator(
  payload: Parameters<typeof archivePathReferenceThought>[1],
): Thunk {
  return dispatch => dispatch({ type: 'archivePathReferenceThought', ...payload })
}

export default _.curryRight(archivePathReferenceThought)

// Register this action's metadata
registerActionMetadata('archivePathReferenceThought', {
  undoable: true,
})
