import { head } from './head'
import { Path, State } from '../@types'
import { getThoughtById } from '../selectors'

/** Returns the value of a the last thought in a path. */
export const headValue = (state: State, path: Path) => getThoughtById(state, head(path)).value
