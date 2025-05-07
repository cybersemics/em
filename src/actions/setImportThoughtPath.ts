import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Prevents the current importThoughtPath from beng deallocated by freeThought. */
const setImportThoughtPath = (state: State, { path }: { path: Path | null }): State => ({
  ...state,
  importThoughtPath: path,
})

/** Action-creator for setImportThoughtPath. */
export const setImportThoughtPathActionCreator =
  (path: Path | null): Thunk =>
  dispatch =>
    dispatch({ type: 'setImportThoughtPath', path })

export default setImportThoughtPath

// Register this action's metadata
registerActionMetadata('setImportThoughtPath', {
  undoable: false,
})
