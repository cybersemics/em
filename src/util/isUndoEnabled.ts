// util
import { State } from './initialState'

/** Determines if undo is enabled. */
export const isUndoEnabled = (state: State) => !!state.inversePatches.length
