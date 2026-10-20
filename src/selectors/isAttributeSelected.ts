import MulticursorFilter from '../@types/MulticursorFilter'
import State from '../@types/State'
import isInAttribute from './isInAttribute'
import selectedPaths from './selectedPaths'

/** Returns true if any selected thought is a metaprogramming attribute or is inside one. Commands are not executable on such a selection unless they opt in with `allowOnAttribute`. Pass the command's multicursor filter so that only the paths the command will execute on are considered. */
const isAttributeSelected = (state: State, filter?: MulticursorFilter): boolean =>
  selectedPaths(state, filter).some(path => isInAttribute(state, path))

export default isAttributeSelected
