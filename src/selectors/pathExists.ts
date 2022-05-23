import { contextToPath } from '../selectors'
import { State } from '../@types'

/** Returns true if every child in the path exists. */
const pathExists = (state: State, pathUnranked: string[]) => contextToPath(state, pathUnranked)

export default pathExists
