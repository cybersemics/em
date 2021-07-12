import { State } from '../@types'

/** Determines if undo is enabled. */
export const isUndoEnabled = (state: State) => !!state.inversePatches.length
