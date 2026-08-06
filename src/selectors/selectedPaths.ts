import Path from '../@types/Path'
import State from '../@types/State'

/** Returns the paths that a command will be executed on: the multicursors if there are any, otherwise the cursor. Empty if there is no selection at all, so that a feasibility check such as `selectedPaths(state).every(...)` is not vacuously true. */
const selectedPaths = (state: State): Path[] =>
  Object.keys(state.multicursors).length ? Object.values(state.multicursors) : state.cursor ? [state.cursor] : []

export default selectedPaths
