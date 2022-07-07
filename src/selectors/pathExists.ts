import State from '../@types/State'
import contextToPath from '../selectors/contextToPath'

/** Returns true if every child in the path exists. */
const pathExists = (state: State, pathUnranked: string[]) => contextToPath(state, pathUnranked)

export default pathExists
