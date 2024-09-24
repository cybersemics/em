import State from '../@types/State'
import getLatestActionType from '../util/getLastActionType'

/** Determines if undo is enabled. */
export default function isUndoEnabled(state: State) {
  return !!getLatestActionType(state.undoPatches)
}
