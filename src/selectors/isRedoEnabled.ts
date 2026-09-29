import State from '../@types/State'

/** Determines if redo is enabled. */
export default function isRedoEnabled(state: State) {
  return state.redoPatches.length > 0
}
