import head from './head'
import Path from '../@types/Path'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'

/** Returns the value of a the last thought in a path. */
const headValue = (state: State, path: Path) => getThoughtById(state, head(path)).value

export default headValue
