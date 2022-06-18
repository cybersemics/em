import State from '../@types/State'
import getLatestActionType from '../util/getLastActionType'

/** Determines if undo is enabled. */
export const isUndoEnabled = (state: State) => !!getLatestActionType(state.undoPatches)
