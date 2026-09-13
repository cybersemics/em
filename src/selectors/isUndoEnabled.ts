import State from '../@types/State'
import getLatestActionLabel from '../util/getLatestActionLabel'

/** Determines if undo is enabled. */
export default function isUndoEnabled(state: State) {
  return !!getLatestActionLabel(state.undoPatches)
}
