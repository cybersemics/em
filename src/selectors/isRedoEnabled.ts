import { State } from '../@types'

/** Determines if redo is enabled. */
export const isRedoEnabled = (state: State) => !!state.patches.length
