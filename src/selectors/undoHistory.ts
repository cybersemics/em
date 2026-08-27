import moize from 'moize'
import Patch from '../@types/Patch'
import State from '../@types/State'

/** Returns the patch-level undo history newest first, spanning the redo stack and undo stack. */
const undoHistory = (state: State): { patches: Patch[]; position: number } => ({
  // redoPatches[0] is the oldest action that was undone, i.e. the newest point in the history.
  patches: [...state.redoPatches, ...[...state.undoPatches].reverse()],
  position: state.redoPatches.length,
})

/** Memoize by the two history stacks so components only re-render when history changes. */
export default moize(undoHistory, {
  maxSize: 1,
  transformArgs: ([state]) => [state.undoPatches, state.redoPatches],
})
