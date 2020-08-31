// util
import { State } from './initialState'

/** Determines if redo is enabled. */
export const isRedoEnabled = (state: State) => !!state.patches.length
