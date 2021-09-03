import { head } from './head'
import { Path, State } from '../@types'

/** Returns the value of a the last thought in a path. */
export const headValue = (state: State, path: Path) => state.thoughts.contextIndex[head(path)].value
