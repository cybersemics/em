import contextToPath from '../selectors/contextToPath'
import State from '../@types/State'

/** Returns true if every child in the path exists. */
const pathExists = (state: State, pathUnranked: string[]) => contextToPath(state, pathUnranked)

export default pathExists
