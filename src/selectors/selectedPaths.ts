import MulticursorFilter from '../@types/MulticursorFilter'
import Path from '../@types/Path'
import State from '../@types/State'
import documentSort from './documentSort'
import filterCursors from './filterCursors'

/** Returns the paths that a command will be executed on: the multicursors if there are any, otherwise the cursor. Pass the command's multicursor filter so that the paths match the ones that executeCommandWithMulticursor will actually execute on. Empty if there is no selection at all, so that a feasibility check such as `selectedPaths(state).every(...)` is not vacuously true. */
const selectedPaths = (state: State, filter?: MulticursorFilter): Path[] => {
  const multicursors = Object.values(state.multicursors)
  return multicursors.length
    ? filter
      ? filterCursors(state, documentSort(state, multicursors), filter)
      : multicursors
    : state.cursor
      ? [state.cursor]
      : []
}

export default selectedPaths
